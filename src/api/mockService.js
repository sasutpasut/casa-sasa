export async function fetchMockData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        message: "Hello from your mock API! 🚀"
      })
    }, 500)
  })
}