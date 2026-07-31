import type { ImageLoaderProps } from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function imageLoader({ src }: ImageLoaderProps) {
  if (!basePath || !src.startsWith("/")) return src;
  return `${basePath}${src}`;
}
