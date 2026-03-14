function extractFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i)
  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return fallback
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() || ''

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    if (payload && typeof payload.error === 'string') {
      return payload.error
    }
  }

  const text = await response.text().catch(() => '')

  if (text.includes('<!DOCTYPE')) {
    return 'El servidor devolvio una pagina HTML en lugar del PDF.'
  }

  return text || 'Error al descargar el recibo'
}

export async function downloadPaymentReceipt(paymentId: string) {
  const fallbackFilename = `recibo-${paymentId.slice(0, 8)}.pdf`
  const response = await fetch(`/api/payments/${paymentId}/receipt`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || ''

  if (!contentType.includes('application/pdf')) {
    throw new Error(await readErrorMessage(response))
  }

  const blob = await response.blob()

  if (blob.size === 0) {
    throw new Error('El PDF se genero vacio')
  }

  const filename = extractFilename(
    response.headers.get('content-disposition'),
    fallbackFilename
  )

  const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url)
    anchor.remove()
  }, 1000)
}
