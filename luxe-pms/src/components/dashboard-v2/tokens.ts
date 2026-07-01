export type ToneV2 = "purple" | "gold" | "green" | "blue" | "pink";

export const TONE_STYLES: Record<ToneV2, { soft: string; text: string }> = {
  purple: { soft: "bg-[#EEEAFF] dark:bg-[#2A2152]", text: "text-[#6D4AFF] dark:text-[#B4A3FF]" },
  gold:   { soft: "bg-[#FDF3D6] dark:bg-[#3A2E12]", text: "text-[#B8860B] dark:text-[#F0C550]" },
  green:  { soft: "bg-[#DCFCE7] dark:bg-[#123822]", text: "text-[#16A34A] dark:text-[#4ADE80]" },
  blue:   { soft: "bg-[#DBEAFE] dark:bg-[#16233F]", text: "text-[#2563EB] dark:text-[#60A5FA]" },
  pink:   { soft: "bg-[#FFE4E9] dark:bg-[#3A1520]", text: "text-[#E11D48] dark:text-[#FB7185]" },
};
