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

export default function GroupDropdown() {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState("")

  useEffect(() => {
    getAllUsers().then(setUsers)
  }, [])

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    )
  }

  const handleCreate = async () => {
    console.log("groupName", groupName)
    console.log("Creating group with members:", selectedUsers)
    await createGroup({ name: groupName, memberIds: selectedUsers })
    toast.success(`Group "${groupName}" created successfully`)
    setOpen(false)
    setGroupName("")
    setSelectedUsers([])
  }

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
                <Button variant="ghost" className="w-full text-left">New Group</Button>
              </DialogTrigger>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent>
          <div className="space-y-4">
            <input
              type="text"
              className="w-full rounded border p-2"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <ScrollArea className="max-h-60 border rounded p-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`cursor-pointer rounded p-2 mb-1 flex justify-between items-center ${selectedUsers.includes(user.id) ? "bg-primary text-white" : "bg-muted"}`}
                >
                  {user.name || user.email}
                  {selectedUsers.includes(user.id) && <span className="text-xs">✔</span>}
                </div>
              ))}
            </ScrollArea>
            <Button onClick={handleCreate} disabled={!groupName || selectedUsers.length < 2}>
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
