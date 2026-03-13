const generateButton = document.getElementById("generate");

if (generateButton) {
  generateButton.addEventListener("click", () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "generate-documentation"
        }
      },
      "*"
    );
  });
}
