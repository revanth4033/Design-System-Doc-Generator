const SECTION_SPACING = 24;
const ELEMENT_SPACING = 12;
const PADDING = 24;

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
