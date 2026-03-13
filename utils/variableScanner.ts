export interface VariableToken {
  name: string;
  type: VariableResolvedDataType;
  value: string;
  collection: string;
}

function rgbaToHex(color: RGBA): string {
  const toHex = (value: number): string => {
    const normalized = Math.round(Math.min(Math.max(value, 0), 1) * 255);
    return normalized.toString(16).padStart(2, "0").toUpperCase();
  };

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function formatVariableValue(value: VariableValue): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }

  if (value && typeof value === "object" && "r" in value && "g" in value && "b" in value) {
    return rgbaToHex(value as RGBA);
  }

  return JSON.stringify(value);
}

export async function scanVariables(): Promise<VariableToken[]> {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync()
  ]);

  const collectionNameById = new Map<string, string>(
    collections.map((collection) => [collection.id, collection.name])
  );

  return variables.map((variable) => {
    const modeIds = Object.keys(variable.valuesByMode);
    const defaultModeId = modeIds[0];
    const rawValue = variable.valuesByMode[defaultModeId];

    return {
      name: variable.name,
      type: variable.resolvedType,
      value: formatVariableValue(rawValue),
      collection: collectionNameById.get(variable.variableCollectionId) ?? "Uncategorized"
    };
  });
}
