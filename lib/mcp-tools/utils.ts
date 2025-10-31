export type McpResponse<T> = {
  content: {
    type: "text";
    text: string;
  }[];
  isError?: boolean;
  structuredContent?: T;
};

export const createStructuredMcpResponse =
  <T>(text: string, structuredContent: T, isError = false) => ({
    content: [{
      type: "text" as const,
      text
    }],
    ...(isError && { isError }),
    ...(structuredContent && { structuredContent })
  });

export const createMcpResponse = (text: string, isError = false) => ({
  content: [{
    type: "text" as const,
    text
  }],
  ...(isError && { isError }),
});

export const createMcpError = (text: string) => createMcpResponse(text, true);