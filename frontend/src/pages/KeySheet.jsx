import React, { useState } from "react"
import { MultiFileDropzone } from "@/components/MultiFileDropZone"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export default function KeySheet({ onPrivateEncryptKeyLoaded }) {
  const [files, setFiles] = useState([])

  const handleFilesAdded = async (addedFiles) => {
    if (addedFiles.length === 0) {
      onPrivateEncryptKeyLoaded("") // Trigger key removal
      return
    }

    const file = addedFiles[0].file
    const text = await file.text()
    onPrivateEncryptKeyLoaded(text)
  }
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-auto">
          Llaves
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Importar Clave Privada</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Aquí podrás cargar tu archivo `.pem` para poder descifrar mensajes.
          </p>
          <MultiFileDropzone
            value={files}
            onChange={setFiles}
            onFilesAdded={handleFilesAdded}
            dropzoneOptions={{
              accept: { "application/x-pem-file": [".pem"] },
              maxFiles: 1,
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
