import Image from "next/image";

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/assets/logos/logo-cyberadspace.png"
      alt="CyberAdSpace"
      width={1138}
      height={886}
      priority
      className={className}
      style={{ width: "auto" }}
    />
  );
}
