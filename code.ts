import { scanVariables } from "./utils/variableScanner";
import { scanStyles } from "./utils/styleScanner";
import { scanComponents } from "./utils/componentScanner";
import { generateDocumentationPage } from "./utils/docGenerator";

figma.showUI(__html__, { width: 360, height: 220 });

async function generateDocumentation(): Promise<void> {
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

figma.ui.onmessage = async (msg: { type: string }) => {
  if (msg.type !== "generate-documentation") {
    return;
  }

  await generateDocumentation();
};
