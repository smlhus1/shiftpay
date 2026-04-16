/** Mock for expo-document-picker — native intent, tests inject CSV fixtures. */
export const getDocumentAsync = jest.fn(async () => ({
  canceled: true,
  assets: null,
}));
