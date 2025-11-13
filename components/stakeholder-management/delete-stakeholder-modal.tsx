"use client"

import React, { useState, useEffect } from "react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"

interface DeleteStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  coordinatorId: string | null
  coordinatorName: string | null
  onConfirmDelete: (id: string) => Promise<void>
}

export default function DeleteStakeholderModal({ isOpen, onClose, coordinatorId, coordinatorName, onConfirmDelete }: DeleteStakeholderModalProps) {
  const [typedName, setTypedName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setTypedName("")
      setIsDeleting(false)
      setError(null)
    }
  }, [isOpen])

  const matches = () => {
    if (!coordinatorName) return false
    return typedName.trim().toLowerCase() === coordinatorName.trim().toLowerCase()
  }

  const handleDelete = async () => {
    if (!coordinatorId) return
    if (!matches()) {
      setError('Typed name does not match')
      return
    }
    setIsDeleting(true)
    setError(null)
    try {
      await onConfirmDelete(coordinatorId)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete stakeholder')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pb-2">
          <div>
            <h2 className="text-lg font-semibold">Confirm delete</h2>
            <p className="text-xs text-default-500">Type <span className="font-semibold">{coordinatorName || 'the stakeholder'}</span> to confirm deletion.</p>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-3">
            <div>
              <p className="text-sm">Stakeholder</p>
              <div className="text-sm font-semibold text-gray-900">{coordinatorName || '—'}</div>
            </div>

            <div className="p-3 bg-danger-50 border border-danger-200 rounded">
              <p className="text-sm font-semibold text-danger">Irreversible action</p>
              <p className="text-xs text-danger">Deleting a stakeholder is permanent and cannot be undone. All associated account data will be removed. Proceed only if you are sure.</p>
            </div>

            <div>
              <label className="text-sm font-medium">Type <span className="font-semibold">{coordinatorName || 'full name'}</span> to confirm</label>
              <Input autoFocus value={typedName} onChange={(e) => setTypedName((e.target as HTMLInputElement).value)} placeholder={coordinatorName || 'Full name'} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
            </div>

            {error && <div className="text-sm text-danger">{error}</div>}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>Cancel</Button>
          <Button
            onPress={handleDelete}
            disabled={!matches() || isDeleting}
            aria-disabled={!matches() || isDeleting}
            className={
              (!matches() || isDeleting)
                ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }
          >
            {isDeleting ? 'Deleting...' : 'Delete stakeholder'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
