"use client";

import { useEffect, useRef, useState } from "react";

const GROUPS = [
  { name: "표정", emoji: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥳 🤩 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 🙄 😬 😮‍💨 😴 🤤 😷 🤒 🤕 🤢 🤮 🤧 😵‍💫" },
  { name: "사람", emoji: "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 💪 🦾 👀 👁️ 👄 👶 🧒 👦 👧 👨 👩 🧑 👴 👵 🙋 🙆 🙅 🤷 🤦 💁 🙇 👨‍👩‍👧" },
  { name: "동물·자연", emoji: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦋 🐝 🐞 🐢 🐍 🦕 🐙 🦀 🐬 🐳 🦈 🐘 🦒 🦓 🐎 🐕 🐈 🌸 🌹 🌺 🌻 🌼 🌷 🌱 🌲 🌳 🌴 🌵 🍀 🍁 🍂 🍃 🌈 ☀️ 🌤️ ☁️ 🌧️ ⛈️ ❄️ 🌊 🔥 ⭐ 🌟 🌙 🌍" },
  { name: "음식", emoji: "🍎 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥝 🍅 🥑 🥦 🥕 🌽 🥐 🍞 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍡 🍧 🍨 🍦 🍰 🎂 🍮 🍫 🍬 🍭 ☕ 🍵 🧋 🥤 🍺 🍻 🍷 🍸 🍹 🍽️ 🥢" },
  { name: "여행·활동", emoji: "✈️ 🛫 🛬 🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚚 🚲 🛴 🏍️ 🚆 🚄 🚅 🚇 🚉 🚢 🛳️ ⛵ 🚀 🗺️ 🧭 🧳 🏖️ 🏝️ 🗻 ⛰️ 🏕️ 🏯 🏰 🏠 🏡 🏢 🏨 🏪 🏬 🏥 🏦 ⛩️ ♨️ 🎡 🎢 🎠 🎪 🎨 🎬 🎤 🎧 🎵 🎮 🎲 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🏸 ⛳ 🏄 🏊 🚴 🧘 🎁 🎉 🎊 🎈 🎫 🏆 🥇" },
  { name: "사물·기호", emoji: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💖 💗 💓 💞 💘 💝 💯 💬 💭 💡 🔔 📌 📍 📎 ✏️ 📝 📋 📚 📖 📅 📱 💻 🖥️ ⌨️ 📷 📸 🎥 📺 📻 🔋 🔌 🔑 🔒 🔓 💰 💵 💴 💶 💷 💳 💱 💸 🛒 📦 ✉️ 📧 📞 🔍 ⚙️ 🔧 🔨 ⚠️ ⛔ ✅ ❌ ❗ ❓ ℹ️ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🇰🇷 🇯🇵" },
] as const;

const SEARCH_TERMS: Record<string, string> = {
  "😀": "웃음 미소 smile", "😊": "웃음 미소 smile", "😂": "눈물 웃음 laugh", "🤣": "웃음 laugh", "😍": "사랑 하트 love", "🥰": "사랑 하트 love", "🥺": "부탁 눈물", "😭": "울음 눈물", "😎": "선글라스 멋짐", "🥳": "축하 파티",
  "👍": "좋아요 엄지", "👎": "싫어요 엄지", "👏": "박수", "🙏": "감사 기도", "👋": "안녕 인사", "❤️": "하트 사랑 빨강", "🧡": "하트 주황", "💛": "하트 노랑", "💚": "하트 초록", "💙": "하트 파랑", "💜": "하트 보라", "💕": "하트 사랑", "💖": "하트 반짝",
  "🌸": "꽃 벚꽃", "🌹": "꽃 장미", "🌻": "꽃 해바라기", "🍀": "행운 클로버", "☀️": "태양 날씨", "🌈": "무지개", "🔥": "불 인기", "⭐": "별", "❄️": "눈 겨울",
  "🍜": "라면 국수 음식", "🍣": "초밥 스시", "🍚": "밥 쌀", "☕": "커피", "🍵": "차 녹차", "🍺": "맥주", "🍷": "와인", "🍽️": "식당 음식점", "🥢": "젓가락",
  "✈️": "비행기 여행", "🚗": "자동차 차", "🚕": "택시", "🚌": "버스", "🚆": "기차 전철", "🚢": "배 선박", "🧳": "여행 가방", "🗺️": "지도 여행", "🏨": "호텔 숙소", "🏯": "일본 성", "⛩️": "신사 일본", "♨️": "온천", "⛳": "골프", "🏖️": "해변 바다", "🎫": "티켓 입장권", "🎁": "선물", "🎉": "축하 파티",
  "📌": "핀 고정", "📍": "위치 장소 핀", "📋": "목록 문서", "📱": "전화 휴대폰", "💻": "컴퓨터 노트북", "📷": "카메라 사진", "💰": "돈 금액", "💳": "카드 결제", "💱": "환전 환율", "🛒": "쇼핑 장바구니", "⚠️": "경고 주의", "✅": "확인 완료", "❌": "삭제 취소", "ℹ️": "정보 안내", "🇰🇷": "한국 국기", "🇯🇵": "일본 국기",
};

type EmojiInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
};

export function EmojiInput({ value, onChange, className, placeholder, title, disabled }: EmojiInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>(GROUPS[0].name);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 16);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: rect.bottom + 340 <= window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - 346),
      });
    };
    const handlePointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    place();
    searchRef.current?.focus();
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const search = query.trim().toLocaleLowerCase();
  const emojis = GROUPS.flatMap((item) => {
    if (!search && item.name !== group) return [];
    const choices = item.emoji.split(" ");
    return search && !item.name.includes(search)
      ? choices.filter((emoji) => emoji.includes(search) || SEARCH_TERMS[emoji]?.includes(search))
      : choices;
  });

  return (
    <div className="flex min-w-0 items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        className={className}
      />
      <button
        ref={buttonRef}
        type="button"
        aria-label="이모티콘 선택"
        aria-expanded={open}
        title="이모티콘 선택"
        disabled={disabled}
        onClick={() => { setQuery(""); setOpen((current) => !current); }}
        className="shrink-0 rounded border border-border bg-white px-2 py-1 text-[16px] hover:bg-bg disabled:opacity-50"
      >
        😊
      </button>
      {open && (
        <div ref={panelRef} role="dialog" aria-label="이모티콘 선택" className="fixed z-[3000] flex h-[336px] w-[min(320px,calc(100vw-16px))] flex-col rounded-xl border border-border bg-white p-3 shadow-xl" style={position}>
          <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이모티콘 검색" aria-label="이모티콘 검색" className="w-full rounded-md border border-border px-3 py-2 text-[14px] outline-none focus:border-primary" />
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="이모티콘 종류">
            {GROUPS.map((item) => <button key={item.name} type="button" role="tab" aria-selected={group === item.name} onClick={() => { setGroup(item.name); setQuery(""); }} className={`shrink-0 rounded px-2 py-1 text-[12px] ${group === item.name && !query ? "bg-primary text-white" : "bg-bg text-text"}`}>{item.name}</button>)}
          </div>
          <div className="mt-2 overflow-y-auto" role="group" aria-label={search ? "검색 결과" : group}>
            {emojis.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">검색 결과가 없습니다.</p> : <div className="grid grid-cols-7 gap-1">
              {emojis.map((emoji) => <button key={emoji} type="button" aria-label={`${emoji} 선택`} title={emoji} onClick={() => { onChange(emoji); setOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded text-[23px] hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary">{emoji}</button>)}
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}
