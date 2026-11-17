// 시연 연출: AI 답이 빨리 와도 "끼루가 답을 찾는 중..." 화면을 최소 1초 보여 준다(답이 1초보다 늦으면 더 기다리지 않는다)
export const AI_MIN_WAIT_MS = 1000

export async function withAiDelay<T>(request: Promise<T>): Promise<T> {
  const [result] = await Promise.all([request, new Promise((resolve) => setTimeout(resolve, AI_MIN_WAIT_MS))])
  return result
}
