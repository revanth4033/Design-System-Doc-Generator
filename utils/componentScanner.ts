export interface ComponentToken {
  id: string;
  name: string;
  description: string;
  variantInfo: string[];
  properties: string[];
}

export interface ComponentSetToken {
  id: string;
  name: string;
  variantNames: string[];
}

function collectVariantInfo(component: ComponentNode): string[] {
  if (!component.parent || component.parent.type !== "COMPONENT_SET") {
    return [];
  }

  const set = component.parent as ComponentSetNode;
  return Object.keys(component.variantProperties ?? {}).map((propertyName) => {
    const propertyValue = component.variantProperties?.[propertyName] ?? "";
    return `${propertyName}: ${propertyValue}`;
  }).concat(set.name ? [`Set: ${set.name}`] : []);
}

function collectComponentProperties(component: ComponentNode): string[] {
  return Object.entries(component.componentPropertyDefinitions).map(
    ([name, definition]) => `${name} (${definition.type})`
  );
}

export async function scanComponents(): Promise<{
  components: ComponentToken[];
  componentSets: ComponentSetToken[];
}> {
  const components = figma.root
    .findAll((node) => node.type === "COMPONENT")
    .map((node) => {
      const component = node as ComponentNode;
      return {
        id: component.id,
        name: component.name,
        description: component.description ?? "",
        variantInfo: collectVariantInfo(component),
        properties: collectComponentProperties(component)
      };
    });

  const componentSets = figma.root
    .findAll((node) => node.type === "COMPONENT_SET")
    .map((node) => {
      const set = node as ComponentSetNode;
      return {
        id: set.id,
        name: set.name,
        variantNames: set.children.map((child) => child.name)
      };
    });

  return { components, componentSets };
}
