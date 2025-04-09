import React from "react"

const Messages = () => {
  return (
    <div className="flex flex-row h-full w-full gap-2 px-4 pb-4 bg-background text-foreground">
      {/* INBOX SIDEBAR */}
      <div className="w-[300px] bg-muted/20 backdrop-blur-sm border border-border text-muted-foreground p-4 rounded-xl flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Inbox</h2>

        {/* Placeholder de chats */}
        <div className="bg-muted/40 rounded-lg h-12 w-full" />
        <div className="bg-muted/40 rounded-lg h-12 w-full" />
        <div className="bg-muted/40 rounded-lg h-12 w-full" />
      </div>

      {/* CHAT PANEL */}
      <div className="flex-1 p-6 bg-muted/10 border border-border rounded-xl overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Adam Bridges</h2>

        <div className="bg-muted p-4 rounded-lg max-w-xl">
          <p className="text-muted-foreground">
            This is a placeholder for chat messages.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Messages
