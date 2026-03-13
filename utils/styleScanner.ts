export interface ColorStyleToken {
  name: string;
  hex: string;
  description: string;
}

export interface TypographyStyleToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

function rgbaToHex(color: RGBA): string {
  const toHex = (value: number): string => {
    const normalized = Math.round(Math.min(Math.max(value, 0), 1) * 255);
    return normalized.toString(16).padStart(2, "0").toUpperCase();
  };

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function getFirstSolidHex(style: PaintStyle): string {
  const solid = style.paints.find(
    (paint): paint is SolidPaint => paint.type === "SOLID"
  );

  if (!solid) {
    return "N/A";
  }

  return rgbaToHex(solid.color);
}

function getLineHeightValue(lineHeight: LineHeight): string {
  if (lineHeight.unit === "AUTO") {
    return "Auto";
  }

  return `${lineHeight.value}${lineHeight.unit === "PIXELS" ? "px" : "%"}`;
}

function getLetterSpacingValue(letterSpacing: LetterSpacing): string {
  return `${letterSpacing.value}${letterSpacing.unit === "PIXELS" ? "px" : "%"}`;
}

function normalizeFontWeight(fontName: FontName): string {
  return fontName.style;
}

export async function scanStyles(): Promise<{
  colorStyles: ColorStyleToken[];
  textStyles: TypographyStyleToken[];
}> {
  const colorStyles = figma.getLocalPaintStyles().map((style) => ({
    name: style.name,
    hex: getFirstSolidHex(style),
    description: style.description ?? ""
  }));

  const textStyles = figma.getLocalTextStyles().map((style) => ({
    name: style.name,
    fontFamily: style.fontName.family,
    fontSize: style.fontSize,
    fontWeight: normalizeFontWeight(style.fontName),
    lineHeight: getLineHeightValue(style.lineHeight),
    letterSpacing: getLetterSpacingValue(style.letterSpacing)
  }));

  return { colorStyles, textStyles };
}
