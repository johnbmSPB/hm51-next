type SmartContactValueProps = {
  label?: string;
  value?: string;
  className?: string;
};

function cleanValue(value: string) {
  return String(value || "").trim();
}

function phoneHref(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 10) return "";

  if (digits.length === 11 && digits.startsWith("8")) {
    return `tel:+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `tel:+7${digits}`;
  }

  if (digits.startsWith("7")) {
    return `tel:+${digits}`;
  }

  return `tel:+${digits}`;
}

function siteHref(value: string) {
  const raw = cleanValue(value);

  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

function mapHref(value: string) {
  const query = encodeURIComponent(value);

  return `https://yandex.ru/maps/?text=${query}`;
}

function detectHref(label = "", value = "") {
  const raw = cleanValue(value);
  const lowerLabel = label.toLowerCase();
  const lowerValue = raw.toLowerCase();

  if (!raw) return "";

  if (lowerLabel.includes("email") || lowerLabel.includes("почт") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return `mailto:${raw}`;
  }

  if (lowerLabel.includes("телефон") || lowerLabel.includes("phone") || lowerLabel.includes("tel")) {
    return phoneHref(raw);
  }

  if (lowerLabel.includes("сайт") || lowerLabel.includes("site") || lowerLabel.includes("website") || lowerValue.startsWith("www.") || /^https?:\/\//i.test(raw)) {
    return siteHref(raw);
  }

  if (lowerLabel.includes("адрес") || lowerLabel.includes("address")) {
    return mapHref(raw);
  }

  return "";
}

export default function SmartContactValue({
  label = "",
  value = "",
  className = "break-words text-sm font-black text-white",
}: SmartContactValueProps) {
  const text = cleanValue(value);

  if (!text) {
    return <span className={className}>—</span>;
  }

  const href = detectHref(label, text);

  if (!href) {
    return <span className={className}>{text}</span>;
  }

  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={`${className} underline decoration-[#20d1a8]/60 underline-offset-4`}
    >
      {text}
    </a>
  );
}
