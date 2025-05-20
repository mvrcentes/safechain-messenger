import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons"
import { getAllUsers } from "@/api/user/user"
import { createGroup } from "@/api/user/group"
import { toast } from "sonner"
import { MultiFileDropzone } from "@/components/MultiFileDropZone"
import { getPreKeysByUserId } from "@/api/keys/keys"

export default function GroupDropdown() {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState("")
  const [keys, setKeys] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    getAllUsers().then(setUsers)
  }, [])

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    )
  }

  const handleFilesAdded = async (addedFiles) => {
    if (addedFiles.length === 0) return
    const file = addedFiles[0].file
    const text = await file.text()

    try {
      const json = JSON.parse(text)

      // Validación rápida
      if (!json.IK || !json.SPK || !json.OPKs) {
        throw new Error("Formato inválido de claves privadas")
      }

      setKeys([
        {
          file: addedFiles[0].file,
          key: "manual",
          progress: "COMPLETE",
          content: json,
        },
      ])
      toast.success("🔑 Claves privadas cargadas exitosamente.")
    } catch (err) {
      console.error("❌ Error parsing keys:", err)
      toast.error("❌ Archivo de claves inválido")
    }
  }

  const handleCreate = async () => {
    if (creating) return // 🚫 ya se está creando

    try {
      setCreating(true)
      const preKeyMap = {}
      await Promise.all(
        selectedUsers.map(async (userId) => {
          const allKeys = await getPreKeysByUserId(userId)
          const availableOPKs = allKeys.OPKs?.filter((k) => !k.used) || []
          if (availableOPKs.length === 0) {
            throw new Error(
              `❌ No hay OPKs disponibles para el usuario ${userId}`
            )
          }
          const opkIndex = allKeys.OPKs.findIndex(
            (k) => k.publicKey === availableOPKs[0].publicKey
          )
          preKeyMap[userId] = {
            IK: allKeys.IK,
            SPK: allKeys.SPK,
            OPK: availableOPKs[0].publicKey,
            opkIndex,
          }
        })
      )

      await createGroup({
        name: groupName,
        memberIds: selectedUsers,
        privateKeys: keys[0].content,
        preKeyMap,
      })

      toast.success(`Group "${groupName}" created successfully`)
      setOpen(false)
      setGroupName("")
      setSelectedUsers([])
    } catch (err) {
      console.error("❌ Error creating group:", err)
      toast.error("❌ Error creating group")
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (keys) {
      console.log("✅ Claves cargadas:", keys)
    }
  }, [keys])

  return (
    <div className="ml-auto">
      <Dialog open={open} onOpenChange={setOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <FontAwesomeIcon icon={faPenToSquare} className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full text-left">
                  New Group
                </Button>
              </DialogTrigger>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">
              Create a New Group
            </h2>

            <div className="mt-4 space-y-4 p-4">
              <p className="text-sm text-muted-foreground">
                Aquí podrás cargar tu archivo `.json` con las claves privadas
                para crear el grupo.
              </p>
              <MultiFileDropzone
                value={keys}
                onChange={setKeys}
                onFilesAdded={handleFilesAdded}
                dropzoneOptions={{
                  accept: { "application/json": [".json"] },
                  maxFiles: 1,
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">Group Name</label>
              <input
                type="text"
                className="w-full rounded border border-border bg-background px-3 py-2"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Select Members
              </label>
              <ScrollArea className="max-h-60 border rounded p-2 space-y-1">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="form-checkbox h-4 w-4"
                    />
                    <span>{user.name || user.email}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>

            <div className="pt-4 text-center">
              <Button
                onClick={handleCreate}
                disabled={!groupName || selectedUsers.length < 2 || creating}
                className="w-full">
                {creating ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
