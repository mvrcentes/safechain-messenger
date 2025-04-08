import app from "./app.js"
import "./database.js"

const PORT = app.get("port")

const main = () => {
  app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`)
  })
}

main()
