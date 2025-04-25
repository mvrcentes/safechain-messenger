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
            <h2 className="text-xl font-semibold text-center">Create a New Group</h2>
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
              <label className="text-sm font-medium block">Select Members</label>
              <ScrollArea className="max-h-60 border rounded p-2 space-y-1">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted cursor-pointer"
                  >
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
                disabled={!groupName || selectedUsers.length < 2}
                className="w-full"
              >
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
