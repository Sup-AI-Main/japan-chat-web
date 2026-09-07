import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  val = val.replace(/\\n/g, "\n");
  env[key] = val;
}

const SHEET_ID = env.GOOGLE_SHEET_ID;
const auth = new google.auth.JWT(
  env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  undefined,
  env.GOOGLE_PRIVATE_KEY,
  ["https://www.googleapis.com/auth/spreadsheets"]
);
const sheets = google.sheets({ version: "v4", auth });

async function getSheetData(tabName, range = "A1:Z1000") {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!${range}`,
    });
    return res.data.values || [];
  } catch (e) {
    return null;
  }
}

async function getSheetTabs() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return res.data.sheets.map(s => s.properties.title);
}

// Check for anomalies
function searchData(rows, patterns) {
  const results = {};
  for (const pat of patterns) {
    results[pat] = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] && row[c].toString().includes(pat)) {
          results[pat].push({ row: r + 1, col: c + 1, value: row[c] });
        }
      }
    }
  }
  return results;
}

async function main() {
  console.log("=== PHASE 2: Google Sheet 실데이터 검증 ===\n");
  console.log(`Spreadsheet ID: ${SHEET_ID}\n`);

  // Step 1: Check all tabs exist
  console.log("--- 1. 시트 탭 존재 여부 ---");
  const tabs = await getSheetTabs();
  const expectedTabs = ["관리안내", "golf_courses", "hotels", "travel_times", "restaurants", "faq", "admin_options", "includes_excludes"];
  for (const t of expectedTabs) {
    console.log(`  ${t}: ${tabs.includes(t) ? "✅ EXISTS" : "❌ MISSING"}`);
  }
  const extraTabs = tabs.filter(t => !expectedTabs.includes(t));
  if (extraTabs.length > 0) {
    console.log(`  ⚠️  추가 탭: ${extraTabs.join(", ")}`);
  }

  console.log("\n");

  // Step 2: Check each sheet
  const sheetsToCheck = [
    "관리안내", "golf_courses", "hotels", "travel_times",
    "restaurants", "faq", "admin_options", "includes_excludes"
  ];

  for (const tabName of sheetsToCheck) {
    console.log(`--- ${tabName} ---`);
    const rows = await getSheetData(tabName);
    if (rows === null) {
      console.log("  ❌ 시트를 읽을 수 없습니다.\n");
      continue;
    }
    if (rows.length === 0) {
      console.log("  ⚠️  빈 시트 (데이터 없음)\n");
      continue;
    }

    const headers = rows[0].map(h => h?.trim() || "");
    const dataRows = rows.slice(1).filter(r => r && r.some(cell => cell && cell.toString().trim()));
    
    console.log(`  Headers (${headers.length}): ${headers.join(" | ")}`);
    console.log(`  Data rows: ${dataRows.length}`);

    // Check ID column
    const idIdx = headers.findIndex(h => h.toLowerCase() === "id");
    if (idIdx >= 0) {
      const ids = dataRows.map(r => r[idIdx]?.trim() || "").filter(Boolean);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dupes.length > 0) {
        console.log(`  ⚠️  중복 ID: ${[...new Set(dupes)].join(", ")}`);
      } else {
        console.log(`  ✅ ID 중복 없음 (${ids.filter(Boolean).length}개)`);
      }
    }

    // Check active column
    const activeIdx = headers.findIndex(h => h.toLowerCase() === "active");
    const visibleIdx = headers.findIndex(h => h.toLowerCase() === "is_visible");
    
    if (activeIdx >= 0) {
      const activeVals = dataRows.map(r => r[activeIdx]?.trim() || "EMPTY");
      const activeCounts = {};
      for (const v of activeVals) activeCounts[v] = (activeCounts[v] || 0) + 1;
      console.log(`  Active 분포: ${JSON.stringify(activeCounts)}`);
    }
    if (visibleIdx >= 0) {
      const visVals = dataRows.map(r => r[visibleIdx]?.trim() || "EMPTY");
      const visCounts = {};
      for (const v of visVals) visCounts[v] = (visCounts[v] || 0) + 1;
      console.log(`  is_visible 분포: ${JSON.stringify(visCounts)}`);
    }

    // Check sort column
    const sortIdx = headers.findIndex(h => h.toLowerCase() === "sort" || h.toLowerCase() === "sort_order");
    if (sortIdx >= 0) {
      const sortVals = dataRows.map(r => r[sortIdx]?.trim() || "EMPTY");
      const s999 = sortVals.filter(v => v === "999");
      if (s999.length > 0) console.log(`  ⚠️  sort=999: ${s999.length}개`);
    }

    // Search for anomalies
    const anomalies = searchData(rows, ["322", "???????", "ㅇㅇㅇ", "SMOKE_TEST", "test_hotel", "test_golf"]);
    for (const [pat, matches] of Object.entries(anomalies)) {
      if (matches.length > 0) {
        console.log(`  ⚠️  "${pat}" 발견 ${matches.length}건:`);
        for (const m of matches.slice(0, 5)) {
          const rowIdx = m.row - 1;
          const rowData = rows[rowIdx] || [];
          console.log(`    Row ${m.row}: ${JSON.stringify(rowData.slice(0, 5))}`);
        }
      }
    }

    // Show first 3 data rows
    if (dataRows.length > 0) {
      console.log(`  샘플 데이터 (첫 3행):`);
      for (let i = 0; i < Math.min(3, dataRows.length); i++) {
        const row = dataRows[i];
        const pairs = headers.map((h, j) => `${h}=${row[j]?.trim() || "⚠️EMPTY"}`);
        console.log(`    [${i + 1}] ${pairs.join(" | ")}`);
      }
    }

    console.log("");
  }

  // Step 3: admin_options 집중 검증
  console.log("--- admin_options 집중 검증 ---");
  const optRows = await getSheetData("admin_options");
  if (optRows && optRows.length > 1) {
    const headers = optRows[0].map(h => h?.trim() || "");
    const dataRows = optRows.slice(1).filter(r => r && r.some(cell => cell && cell.toString().trim()));
    
    // Check column shift: option_type should be AREA/CATEGORY
    const otIdx = headers.findIndex(h => h.toLowerCase() === "option_type");
    const codeIdx = headers.findIndex(h => h.toLowerCase() === "code");
    const groupIdx = headers.findIndex(h => h.toLowerCase() === "group");
    
    if (otIdx >= 0) {
      const otVals = dataRows.map(r => r[otIdx]?.trim() || "EMPTY");
      const otCounts = {};
      for (const v of otVals) otCounts[v] = (otCounts[v] || 0) + 1;
      console.log(`  option_type 분포: ${JSON.stringify(otCounts)}`);
    }
    
    if (codeIdx >= 0 && otIdx >= 0) {
      // Show CATEGORY rows with their group
      const categoryRows = dataRows.filter(r => r[otIdx]?.trim() === "CATEGORY");
      console.log(`\n  CATEGORY 행 (${categoryRows.length}개):`);
      for (const row of categoryRows) {
        const id = row[headers.findIndex(h => h.toLowerCase() === "id")]?.trim() || "?";
        const code = row[codeIdx]?.trim() || "?";
        const label = row[headers.findIndex(h => h === "관리자 화면 표시명" || h.toLowerCase() === "label")]?.trim() || "?";
        const group = groupIdx >= 0 ? (row[groupIdx]?.trim() || "?") : "?";
        const active = row[headers.findIndex(h => h.toLowerCase() === "active")]?.trim() || "?";
        const sort = row[headers.findIndex(h => h.toLowerCase() === "sort")]?.trim() || "?";
        console.log(`    ${id} | code=${code} | label=${label} | group=${group} | active=${active} | sort=${sort}`);
      }

      // Check expected group mapping
      const expectedGroups = { GOLF: "AREA", HOTEL: "AREA", RESTAURANT: "AREA", ONSEN: "COMMON", DRIVER: "COMMON", GENERAL: "COMMON", REFUND: "COMMON", MONEY: "COMMON", EXTRA_PAYMENT: "COMMON" };
      for (const row of categoryRows) {
        const code = row[codeIdx]?.trim();
        const group = groupIdx >= 0 ? row[groupIdx]?.trim() : "?";
        if (code && expectedGroups[code] && group !== expectedGroups[code]) {
          console.log(`  ❌ ${code}: expected group=${expectedGroups[code]}, got group=${group}`);
        }
      }

      // Check duplicate code
      const codes = categoryRows.map(r => r[codeIdx]?.trim()).filter(Boolean);
      const dupCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
      if (dupCodes.length > 0) {
        console.log(`  ⚠️  중복 code: ${[...new Set(dupCodes)].join(", ")}`);
      }
    }

    // Check for test/placeholder rows in admin_options
    const allOpts = searchData(optRows, ["322", "???????", "테스트", "test"]);
    for (const [pat, matches] of Object.entries(allOpts)) {
      if (matches.length > 0) {
        console.log(`  ⚠️  ${pat}: ${matches.length}건`);
      }
    }
  }

  console.log("\n");

  // Step 4: travel_times 관계 검증
  console.log("--- travel_times 관계 검증 ---");
  const ttRows = await getSheetData("travel_times");
  const golfRows = await getSheetData("golf_courses");
  const hotelRows = await getSheetData("hotels");

  if (ttRows && ttRows.length > 1) {
    const ttHeaders = ttRows[0].map(h => h?.trim() || "");
    const ttData = ttRows.slice(1).filter(r => r && r.some(cell => cell && cell.toString().trim()));
    
    const fromIdIdx = ttHeaders.findIndex(h => h === "from_id" || h === "hotel_id");
    const toIdIdx = ttHeaders.findIndex(h => h === "to_id" || h === "golf_id");

    const hotelIds = new Set(
      hotelRows?.slice(1)?.map(r => {
        const idx = hotelRows[0].findIndex(h => h?.trim().toLowerCase() === "id");
        return idx >= 0 ? r[idx]?.trim() : null;
      }).filter(Boolean) || []
    );
    const golfIds = new Set(
      golfRows?.slice(1)?.map(r => {
        const idx = golfRows[0].findIndex(h => h?.trim().toLowerCase() === "id");
        return idx >= 0 ? r[idx]?.trim() : null;
      }).filter(Boolean) || []
    );

    let orphanCount = 0;
    if (fromIdIdx >= 0 && toIdIdx >= 0) {
      for (const row of ttData) {
        const fromId = row[fromIdIdx]?.trim();
        const toId = row[toIdIdx]?.trim();
        if (fromId && !hotelIds.has(fromId)) {
          console.log(`  ⚠️  orphan from_id: ${fromId}`);
          orphanCount++;
        }
        if (toId && !golfIds.has(toId)) {
          console.log(`  ⚠️  orphan to_id: ${toId}`);
          orphanCount++;
        }
      }
      if (orphanCount === 0) console.log("  ✅ orphan relation 없음");
      else console.log(`  ❌ orphan 관계 ${orphanCount}건 발견`);
    }
  }

  console.log("\n=== 검증 완료 ===");
}

main().catch(console.error);