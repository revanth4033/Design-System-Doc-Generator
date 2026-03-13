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
