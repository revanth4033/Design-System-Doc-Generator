// Design System Documentation Generator (pure JavaScript, no build step)

figma.showUI(__html__, { width: 360, height: 220 });

const SECTION_SPACING = 24;
const ELEMENT_SPACING = 12;
const PADDING = 24;

function rgbaToHex(color) {
  const toHex = (value) => {
    const normalized = Math.round(Math.min(Math.max(value, 0), 1) * 255);
    return normalized.toString(16).padStart(2, "0").toUpperCase();
  };

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function formatVariableValue(value) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }

  if (value && typeof value === "object" && "r" in value && "g" in value && "b" in value) {
    return rgbaToHex(value);
  }

  return JSON.stringify(value);
}

async function scanVariables() {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync()
  ]);

  const collectionNameById = new Map(collections.map((collection) => [collection.id, collection.name]));

  return variables.map((variable) => {
    const modeIds = Object.keys(variable.valuesByMode);
    const defaultModeId = modeIds[0];
    const rawValue = variable.valuesByMode[defaultModeId];

    return {
      name: variable.name,
      type: variable.resolvedType,
      value: formatVariableValue(rawValue),
      collection: collectionNameById.get(variable.variableCollectionId) || "Uncategorized"
    };
  });
}

function getFirstSolidHex(style) {
  const solid = style.paints.find((paint) => paint.type === "SOLID");

  if (!solid) {
    return "N/A";
  }

  return rgbaToHex(solid.color);
}

function getLineHeightValue(lineHeight) {
  if (lineHeight.unit === "AUTO") {
    return "Auto";
  }

  return `${lineHeight.value}${lineHeight.unit === "PIXELS" ? "px" : "%"}`;
}

function getLetterSpacingValue(letterSpacing) {
  return `${letterSpacing.value}${letterSpacing.unit === "PIXELS" ? "px" : "%"}`;
}

function normalizeFontWeight(fontName) {
  return fontName.style;
}

async function scanStyles() {
  const colorStyles = figma.getLocalPaintStyles().map((style) => ({
    name: style.name,
    hex: getFirstSolidHex(style),
    description: style.description || ""
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

function collectVariantInfo(component) {
  if (!component.parent || component.parent.type !== "COMPONENT_SET") {
    return [];
  }

  const set = component.parent;
  return Object.keys(component.variantProperties || {})
    .map((propertyName) => {
      const propertyValue = (component.variantProperties && component.variantProperties[propertyName]) || "";
      return `${propertyName}: ${propertyValue}`;
    })
    .concat(set.name ? [`Set: ${set.name}`] : []);
}

function collectComponentProperties(component) {
  return Object.entries(component.componentPropertyDefinitions).map(([name, definition]) => `${name} (${definition.type})`);
}

async function scanComponents() {
  const components = figma.root.findAll((node) => node.type === "COMPONENT").map((component) => ({
    id: component.id,
    name: component.name,
    description: component.description || "",
    variantInfo: collectVariantInfo(component),
    properties: collectComponentProperties(component)
  }));

  const componentSets = figma.root.findAll((node) => node.type === "COMPONENT_SET").map((set) => ({
    id: set.id,
    name: set.name,
    variantNames: set.children.map((child) => child.name)
  }));

  return { components, componentSets };
}

async function createTextNode(content, fontSize, fontName) {
  const text = figma.createText();
  const resolvedFontSize = typeof fontSize === "number" ? fontSize : 14;
  const resolvedFontName = fontName || { family: "Inter", style: "Regular" };

  await figma.loadFontAsync(resolvedFontName);
  text.fontName = resolvedFontName;
  text.characters = content;
  text.fontSize = resolvedFontSize;
  return text;
}

function createVerticalFrame(name, spacing, padding) {
  const frame = figma.createFrame();
  const resolvedPadding = typeof padding === "number" ? padding : 0;

  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = spacing;
  frame.paddingTop = resolvedPadding;
  frame.paddingBottom = resolvedPadding;
  frame.paddingLeft = resolvedPadding;
  frame.paddingRight = resolvedPadding;
  frame.fills = [];
  frame.strokes = [];
  return frame;
}

function setSolidFill(node, hex) {
  const parsed = /^#?([A-Fa-f0-9]{6})$/.exec(hex);
  if (!parsed) {
    node.fills = [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } }];
    return;
  }

  const value = parsed[1];
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  node.fills = [{ type: "SOLID", color: { r, g, b } }];
}

async function buildColorsSection(colorStyles, variables) {
  const section = createVerticalFrame("Colors", ELEMENT_SPACING);
  section.appendChild(await createTextNode("Colors", 24, { family: "Inter", style: "Bold" }));

  const colorsFrame = createVerticalFrame("Color Tokens", ELEMENT_SPACING);
  const colorVariables = variables.filter((v) => v.type === "COLOR");

  for (const color of colorStyles) {
    const card = createVerticalFrame(`Color/${color.name}`, 8, 12);
    const swatch = figma.createRectangle();
    swatch.resize(240, 48);
    setSolidFill(swatch, color.hex);
    swatch.cornerRadius = 8;

    card.appendChild(swatch);
    card.appendChild(await createTextNode(color.name, 14, { family: "Inter", style: "Medium" }));
    card.appendChild(await createTextNode(color.hex, 12));
    if (color.description) {
      card.appendChild(await createTextNode(color.description, 12));
    }

    colorsFrame.appendChild(card);
  }

  for (const variable of colorVariables) {
    const card = createVerticalFrame(`Color Variable/${variable.name}`, 8, 12);
    const swatch = figma.createRectangle();
    swatch.resize(240, 48);
    setSolidFill(swatch, variable.value);
    swatch.cornerRadius = 8;

    card.appendChild(swatch);
    card.appendChild(await createTextNode(variable.name, 14, { family: "Inter", style: "Medium" }));
    card.appendChild(await createTextNode(variable.value, 12));
    card.appendChild(await createTextNode(variable.collection, 12));
    colorsFrame.appendChild(card);
  }

  section.appendChild(colorsFrame);
  return section;
}

async function buildTypographySection(textStyles) {
  const section = createVerticalFrame("Typography", ELEMENT_SPACING);
  section.appendChild(await createTextNode("Typography", 24, { family: "Inter", style: "Bold" }));

  const list = createVerticalFrame("Typography Cards", ELEMENT_SPACING);

  for (const style of textStyles) {
    const card = createVerticalFrame(`Typography/${style.name}`, 6, 12);
    card.appendChild(await createTextNode(style.name, 16, { family: "Inter", style: "Medium" }));
    card.appendChild(await createTextNode(style.fontFamily, 14));
    card.appendChild(await createTextNode(`Size: ${style.fontSize}px`, 12));
    card.appendChild(await createTextNode(`Weight: ${style.fontWeight}`, 12));
    card.appendChild(await createTextNode(`Line Height: ${style.lineHeight}`, 12));
    card.appendChild(await createTextNode(`Letter Spacing: ${style.letterSpacing}`, 12));
    list.appendChild(card);
  }

  section.appendChild(list);
  return section;
}

async function buildVariablesSection(variables) {
  const section = createVerticalFrame("Variables", ELEMENT_SPACING);
  section.appendChild(await createTextNode("Variables", 24, { family: "Inter", style: "Bold" }));

  const grouped = new Map();
  for (const variable of variables) {
    const bucket = grouped.get(variable.collection) || [];
    bucket.push(variable);
    grouped.set(variable.collection, bucket);
  }

  for (const [collectionName, collectionVariables] of grouped.entries()) {
    const collectionFrame = createVerticalFrame(`Collection/${collectionName}`, 8, 12);
    collectionFrame.appendChild(await createTextNode(`Collection: ${collectionName}`, 16, { family: "Inter", style: "Medium" }));

    for (const variable of collectionVariables) {
      const tokenBlock = createVerticalFrame(`Token/${variable.name}`, 4, 8);
      tokenBlock.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
      tokenBlock.strokeWeight = 1;
      tokenBlock.cornerRadius = 8;
      tokenBlock.appendChild(await createTextNode(variable.name, 13, { family: "Inter", style: "Medium" }));
      tokenBlock.appendChild(await createTextNode(`${variable.type} → ${variable.value}`, 12));
      collectionFrame.appendChild(tokenBlock);
    }

    section.appendChild(collectionFrame);
  }

  return section;
}

async function buildComponentsSection(components, componentSets) {
  const section = createVerticalFrame("Components", ELEMENT_SPACING);
  section.appendChild(await createTextNode("Components", 24, { family: "Inter", style: "Bold" }));

  const library = createVerticalFrame("Component Library", ELEMENT_SPACING);

  const setByName = new Map(componentSets.map((set) => [set.name, set]));

  for (const item of components) {
    const card = createVerticalFrame(`Component/${item.name}`, 8, 12);
    card.appendChild(await createTextNode(item.name, 16, { family: "Inter", style: "Medium" }));

    if (item.description) {
      card.appendChild(await createTextNode(item.description, 12));
    }

    const node = figma.getNodeById(item.id);
    if (node && node.type === "COMPONENT") {
      const instance = node.createInstance();
      instance.name = `${item.name} Preview`;
      card.appendChild(instance);
    }

    if (item.variantInfo.length > 0) {
      card.appendChild(await createTextNode(`Variant Info: ${item.variantInfo.join(" • ")}`, 12));
    }

    if (item.properties.length > 0) {
      card.appendChild(await createTextNode(`Properties: ${item.properties.join(", ")}`, 12));
    }

    const set = setByName.get(item.name);
    if (set && set.variantNames.length > 0) {
      card.appendChild(await createTextNode(`Variants: ${set.variantNames.join(", ")}`, 12));
    }

    library.appendChild(card);
  }

  for (const set of componentSets) {
    const setCard = createVerticalFrame(`Component Set/${set.name}`, 8, 12);
    setCard.appendChild(await createTextNode(`${set.name} Variants`, 14, { family: "Inter", style: "Medium" }));
    setCard.appendChild(await createTextNode(set.variantNames.join(" • "), 12));
    library.appendChild(setCard);
  }

  section.appendChild(library);
  return section;
}

async function generateDocumentationPage(data) {
  const page = figma.createPage();
  page.name = "Design System Documentation";

  const root = createVerticalFrame("Design System Documentation", SECTION_SPACING, PADDING);
  root.x = 120;
  root.y = 120;
  root.resizeWithoutConstraints(1200, 100);

  root.appendChild(await createTextNode("Design System Documentation", 32, { family: "Inter", style: "Bold" }));

  const foundations = createVerticalFrame("Foundations", SECTION_SPACING);
  foundations.appendChild(await createTextNode("Foundations", 28, { family: "Inter", style: "Bold" }));
  foundations.appendChild(await buildColorsSection(data.colorStyles, data.variables));
  foundations.appendChild(await buildTypographySection(data.textStyles));
  foundations.appendChild(await buildVariablesSection(data.variables));

  const componentsSection = await buildComponentsSection(data.components, data.componentSets);

  root.appendChild(foundations);
  root.appendChild(componentsSection);

  page.appendChild(root);
  figma.currentPage = page;
  figma.viewport.scrollAndZoomIntoView([root]);

  return page;
}

async function generateDocumentation() {
  const [variables, styles, components] = await Promise.all([
    scanVariables(),
    scanStyles(),
    scanComponents()
  ]);

  await generateDocumentationPage({
    variables,
    colorStyles: styles.colorStyles,
    textStyles: styles.textStyles,
    components: components.components,
    componentSets: components.componentSets
  });

  figma.notify("Design system documentation generated.");
}

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== "generate-documentation") {
    return;
  }

  await generateDocumentation();
};
