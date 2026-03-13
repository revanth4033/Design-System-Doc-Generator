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
