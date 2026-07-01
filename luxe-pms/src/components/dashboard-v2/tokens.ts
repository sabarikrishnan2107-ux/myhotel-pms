export type ToneV2 = "purple" | "gold" | "green" | "blue" | "pink";

export const TONE_STYLES: Record<ToneV2, { soft: string; text: string }> = {
  purple: { soft: "bg-[#EEEAFF]", text: "text-[#6D4AFF]" },
  gold:   { soft: "bg-[#FDF3D6]", text: "text-[#B8860B]" },
  green:  { soft: "bg-[#DCFCE7]", text: "text-[#16A34A]" },
  blue:   { soft: "bg-[#DBEAFE]", text: "text-[#2563EB]" },
  pink:   { soft: "bg-[#FFE4E9]", text: "text-[#E11D48]" },
};
