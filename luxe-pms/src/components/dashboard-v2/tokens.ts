export type ToneV2 = "purple" | "gold" | "green" | "blue" | "pink";

export const TONE_STYLES: Record<ToneV2, { soft: string; text: string; solid: string; solidText: string }> = {
  purple: { soft: "bg-[#EEEAFF]", text: "text-[#6D4AFF]", solid: "bg-[#6D4AFF]", solidText: "text-white" },
  gold:   { soft: "bg-[#FDF3D6]", text: "text-[#B8860B]", solid: "bg-[#F5B800]", solidText: "text-[#101A33]" },
  green:  { soft: "bg-[#DCFCE7]", text: "text-[#16A34A]", solid: "bg-[#22C55E]", solidText: "text-white" },
  blue:   { soft: "bg-[#DBEAFE]", text: "text-[#2563EB]", solid: "bg-[#3B82F6]", solidText: "text-white" },
  pink:   { soft: "bg-[#FFE4E9]", text: "text-[#E11D48]", solid: "bg-[#F43F5E]", solidText: "text-white" },
};
