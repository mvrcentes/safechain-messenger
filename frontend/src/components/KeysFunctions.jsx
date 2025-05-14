// Convertir un ArrayBuffer a formato PEM
export function convertArrayBufferToPem(buffer, label) {
  const base64 = window.btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const chunks = base64.match(/.{1,64}/g).join("\n")
  return `-----BEGIN ${label}-----\n${chunks}\n-----END ${label}-----\n`
}

// Generar un par de llaves RSA-OAEP
export async function generateRSAKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )
}

// Exportar la public key a formato PEM
export async function exportPublicKey(publicKey) {
  const spki = await window.crypto.subtle.exportKey("spki", publicKey)
  return convertArrayBufferToPem(spki, "PUBLIC KEY")
}

// Exportar la private key a formato PEM
export async function exportPrivateKey(privateKey) {
  const pkcs8 = await window.crypto.subtle.exportKey("pkcs8", privateKey)
  return convertArrayBufferToPem(pkcs8, "PRIVATE KEY")
}

// Descargar la private key como archivo .pem con nombre personalizado
export function downloadPrivateKeyPem(privateKeyPem, filename = "private_key.pem") {
  const blob = new Blob([privateKeyPem], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
