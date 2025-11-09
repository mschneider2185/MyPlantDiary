export async function diagnosePlant(imageBase64: string) {
  return {
    provider: "mock",
    conditions: [
      { issue: "Overwatering", confidence: 0.67, advice: "Let soil dry, improve drainage." },
      { issue: "Low Light Stress", confidence: 0.52, advice: "Move to bright, indirect light." }
    ]
  };
}
