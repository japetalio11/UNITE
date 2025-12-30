"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Persons as Users, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"
import { Spinner } from "@heroui/spinner"
import { useStakeholderManagement } from "@/hooks/useStakeholderManagement"

interface AddStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isSubmitting?: boolean
  modalError?: string | null
  onClearError?: () => void
}

export default function AddStakeholderModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  modalError = null,
  onClearError = undefined,
}: AddStakeholderModalProps) {
  const {
    roleOptions,
    municipalityOptions,
    barangayOptions,
    organizationOptions,
    canChooseMunicipality,
    canChooseOrganization,
    isSystemAdmin,
    canSelectOrganization,
    loading: hookLoading,
    fetchBarangays,
  } = useStakeholderManagement()

  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("")
  const [selectedBarangay, setSelectedBarangay] = useState<string>("")
  const [selectedOrganization, setSelectedOrganization] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRetypePassword, setShowRetypePassword] = useState(false)
  const [organizationInput, setOrganizationInput] = useState<string>("")
  const [municipalityTouched, setMunicipalityTouched] = useState(false)

  // Set default role and organization for non-system-admins
  useEffect(() => {
    // Auto-select first role if only one option available
    if (roleOptions.length > 0 && !selectedRole) {
      const firstRole = roleOptions[0]
      const roleId = firstRole._id || firstRole.id
      if (roleId) {
        setSelectedRole(String(roleId))
      }
    }
    
    // Auto-select first organization if only one option available
    if (!canChooseOrganization && organizationOptions.length > 0 && !selectedOrganization) {
      const org = organizationOptions[0]
      const orgId = org._id
      if (orgId) {
        setSelectedOrganization(String(orgId))
      }
    }
  }, [roleOptions, canChooseOrganization, organizationOptions, selectedRole, selectedOrganization])

  // Fetch barangays when municipality is selected
  useEffect(() => {
    if (selectedMunicipality) {
      fetchBarangays(selectedMunicipality)
      // Reset barangay selection when municipality changes
      setSelectedBarangay("")
    } else {
      setSelectedBarangay("")
    }
  }, [selectedMunicipality, fetchBarangays])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRole("")
      setSelectedMunicipality("")
      setSelectedBarangay("")
      setSelectedOrganization("")
      setOrganizationInput("")
      setMunicipalityTouched(false)
    }
  }, [isOpen])


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const firstName = (formData.get("firstName") || "").toString()
    const middleName = (formData.get("middleName") || "").toString()
    const lastName = (formData.get("lastName") || "").toString()
    const email = (formData.get("coordinatorEmail") || "").toString()
    const phoneNumber = (formData.get("contactNumber") || "").toString()
    const password = (formData.get("password") || "").toString()
    const retypePassword = (formData.get("retypePassword") || "").toString()
    const organizationInstitution = (formData.get("organization") as string) || organizationInput || ""

    // Mark municipality as touched when form is submitted
    setMunicipalityTouched(true)

    // Validation
    if (password !== retypePassword) {
      alert("Passwords do not match!")
      return
    }

    // Validation
    if (!selectedRole) {
      alert("Please select a role.")
      return
    }

    if (!selectedMunicipality) {
      alert("Please select a municipality.")
      return
    }

    // For coordinators, ensure organization is set
    if (!canChooseOrganization && organizationOptions.length > 0 && !selectedOrganization) {
      const org = organizationOptions[0]
      const orgId = org._id
      if (orgId) {
        setSelectedOrganization(String(orgId))
        // Wait a moment for state to update, then continue
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // Validate organization if provided
    if (selectedOrganization && !canSelectOrganization(selectedOrganization)) {
      alert("Selected organization is outside your jurisdiction.")
      return
    }

    // For coordinators, organizationId is required
    const finalOrganizationId = selectedOrganization || (organizationOptions.length > 0 ? String(organizationOptions[0]._id) : undefined)

    // Prepare data for API - use selected role ID
    const data = {
      firstName,
      middleName: middleName || undefined,
      lastName,
      email,
      phoneNumber: phoneNumber || undefined,
      password,
      roles: [selectedRole], // Use selected role ID
      municipalityId: selectedMunicipality,
      barangayId: selectedBarangay || undefined, // Optional
      organizationId: finalOrganizationId,
      organizationInstitution: organizationInstitution || undefined,
      pageContext: 'stakeholder-management', // Important: tells backend this is stakeholder creation
    }

    // Call the parent's onSubmit handler which handles the API call
    // This prevents duplicate API calls
    // Note: onSubmit should throw on error to prevent modal from closing
    try {
      await onSubmit(data)
      // Only close modal if submission was successful (no error thrown)
      onClose()
    } catch (error: any) {
      // Error is handled by parent component and displayed via modalError prop
      // Don't close modal on error - let user see the error and fix it
      // The parent's handleModalSubmit will set modalError which is displayed in the modal
    }
  }


  return (
    <Modal
      classNames={{
        base: "max-h-[95vh] w-full max-w-2xl",
        body: "py-6",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-2 pb-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-100">
                  <Users className="w-4 h-4 text-gray-700" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Add Stakeholder</h2>
              </div>
              <p className="text-sm font-normal text-gray-500">
                Please enter the stakeholder's information below to add them to the system.
              </p>
            </ModalHeader>
            <ModalBody className="gap-4 px-6 py-6 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <span>{modalError}</span>
                    <button
                      className="ml-3 text-xs font-medium text-red-600 hover:text-red-800 whitespace-nowrap"
                      type="button"
                      onClick={() => {
                        if (onClearError) onClearError()
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Role Selection - Always show dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Role <span className="text-red-500">*</span>
                </label>
                <Select
                  isRequired
                  aria-label="Role"
                  classNames={{
                    trigger: "border-gray-300",
                  }}
                  placeholder={hookLoading ? "Loading roles..." : roleOptions.length === 0 ? "No roles available" : "Select a role"}
                  name="role"
                  radius="md"
                  selectedKeys={selectedRole ? new Set([selectedRole]) : new Set()}
                  size="md"
                  variant="bordered"
                  isDisabled={hookLoading || roleOptions.length === 0}
                  description={roleOptions.length > 0 ? "Select a role with authority below coordinator level (< 60)" : hookLoading ? "Loading available roles..." : "No roles available. Contact an administrator."}
                  onSelectionChange={(keys: any) => {
                    const roleId = Array.from(keys)[0] as string
                    setSelectedRole(roleId || "")
                  }}
                >
                  {roleOptions.map((role) => {
                    const roleId = role._id || role.id
                    const roleName = role.name || role.code || String(roleId)
                    return (
                      <SelectItem key={String(roleId)} textValue={roleName}>
                        {roleName} {role.authority !== undefined ? `(Authority: ${role.authority})` : ''}
                      </SelectItem>
                    )
                  })}
                </Select>
                {roleOptions.length === 0 && !hookLoading && (
                  <p className="text-xs text-red-500">
                    No roles available. You need roles with authority below coordinator level (&lt; 60) to create stakeholders.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Stakeholder Name <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="First name"
                    name="firstName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Middle name"
                    name="middleName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Last name"
                    name="lastName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Stakeholder Email <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  placeholder="Enter stakeholder email"
                  name="coordinatorEmail"
                  radius="md"
                  size="md"
                  type="email"
                  variant="bordered"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  placeholder="Enter contact number"
                  name="contactNumber"
                  radius="md"
                  size="md"
                  type="tel"
                  variant="bordered"
                />
              </div>

              {/* Set Password and Retype Password - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Set Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    }
                    placeholder="Set password"
                    name="password"
                    radius="md"
                    size="md"
                    type={showPassword ? "text" : "password"}
                    variant="bordered"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Retype Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    endContent={
                      <button
                        className="focus:outline-none"
                        type="button"
                        onClick={() => setShowRetypePassword(!showRetypePassword)}
                      >
                        {showRetypePassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    }
                    placeholder="Retype password"
                    name="retypePassword"
                    radius="md"
                    size="md"
                    type={showRetypePassword ? "text" : "password"}
                    variant="bordered"
                  />
                </div>
              </div>

              {/* Municipality Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Municipality <span className="text-red-500">*</span>
                </label>
                <Select
                  isRequired
                  aria-label="Municipality"
                  classNames={{
                    trigger: "border-gray-300",
                  }}
                  placeholder={hookLoading ? "Loading..." : canChooseMunicipality ? "Select a municipality" : municipalityOptions.length > 0 ? "Select a municipality" : "No municipalities available"}
                  name="municipality"
                  radius="md"
                  selectedKeys={selectedMunicipality ? new Set([selectedMunicipality]) : new Set()}
                  size="md"
                  variant="bordered"
                  isDisabled={hookLoading || municipalityOptions.length === 0}
                  isInvalid={municipalityTouched && !selectedMunicipality}
                  errorMessage={municipalityTouched && !selectedMunicipality ? "Please select a municipality" : undefined}
                  description={
                    hookLoading 
                      ? "Loading municipalities..." 
                      : municipalityOptions.length === 0 
                        ? "No municipalities available in your coverage areas. Contact an administrator to assign coverage areas to your account." 
                        : !canChooseMunicipality && municipalityOptions.length > 0
                          ? "You can only select municipalities within your assigned coverage areas"
                          : canChooseMunicipality
                            ? "Select any municipality (system admin)"
                            : undefined
                  }
                  onSelectionChange={(keys: any) => {
                    const muniId = Array.from(keys)[0] as string
                    setSelectedMunicipality(muniId || "")
                    if (muniId) {
                      fetchBarangays(muniId)
                      // Clear error state when valid selection is made
                      if (municipalityTouched) {
                        setMunicipalityTouched(false)
                      }
                    }
                  }}
                >
                  {municipalityOptions.map((muni) => {
                    const muniId = muni._id || muni.id
                    const muniName = muni.name || String(muniId)
                    return (
                      <SelectItem key={String(muniId)} textValue={muniName}>
                        {muniName}
                      </SelectItem>
                    )
                  })}
                </Select>
                {municipalityOptions.length === 0 && !hookLoading && (
                  <p className="text-xs text-red-500">
                    No municipalities available. You need assigned coverage areas with municipalities to create stakeholders. Contact an administrator.
                  </p>
                )}
              </div>

              {/* Barangay Selection (Optional) */}
              {selectedMunicipality && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Barangay <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <Select
                    aria-label="Barangay"
                    classNames={{
                      trigger: "border-gray-300",
                    }}
                    placeholder={hookLoading ? "Loading barangays..." : barangayOptions.length === 0 ? "No barangays available" : "Select a barangay (Optional)"}
                    name="barangay"
                    radius="md"
                    selectedKeys={selectedBarangay ? new Set([selectedBarangay]) : new Set()}
                    size="md"
                    variant="bordered"
                    isDisabled={hookLoading || barangayOptions.length === 0}
                    description="Barangay selection is optional"
                    onSelectionChange={(keys: any) => {
                      const barangayId = Array.from(keys)[0] as string
                      setSelectedBarangay(barangayId)
                    }}
                  >
                    {barangayOptions.map((barangay) => {
                      const barangayId = barangay._id || barangay.id
                      const barangayName = barangay.name || String(barangayId)
                      return (
                        <SelectItem key={String(barangayId)} textValue={barangayName}>
                          {barangayName}
                        </SelectItem>
                      )
                    })}
                  </Select>
                  {barangayOptions.length === 0 && selectedMunicipality && !hookLoading && (
                    <p className="text-xs text-gray-500">
                      No barangays available for this municipality.
                    </p>
                  )}
                </div>
              )}

              {/* Organization Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Organization
                </label>
                {canChooseOrganization && organizationOptions.length > 1 ? (
                  <Select
                    aria-label="Organization"
                    classNames={{
                      trigger: "border-gray-300",
                    }}
                    placeholder={hookLoading ? "Loading organizations..." : "Select Organization"}
                    name="organization"
                    radius="md"
                    selectedKeys={selectedOrganization ? new Set([selectedOrganization]) : new Set()}
                    size="md"
                    variant="bordered"
                    isDisabled={hookLoading || organizationOptions.length === 0}
                    isRequired
                    description={isSystemAdmin ? "Select any organization (system admin)" : "Select from your assigned organizations"}
                    onSelectionChange={(keys: any) => {
                      const orgId = Array.from(keys)[0] as string
                      setSelectedOrganization(orgId)
                    }}
                  >
                    {organizationOptions.map((org) => {
                      const orgId = org._id
                      const orgName = org.name || String(orgId)
                      return (
                        <SelectItem key={String(orgId)} textValue={orgName}>
                          {orgName}
                        </SelectItem>
                      )
                    })}
                  </Select>
                ) : organizationOptions.length > 0 ? (
                  <>
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-gray-300 bg-gray-50",
                      }}
                      name="organization_display"
                      placeholder="Organization"
                      radius="md"
                      size="md"
                      type="text"
                      value={organizationOptions[0].name || String(organizationOptions[0]._id)}
                      variant="bordered"
                      description={organizationOptions.length === 1 ? "Organization is automatically set to your assigned organization" : "Organization is automatically set"}
                    />
                    <input name="organization" type="hidden" value={selectedOrganization || String(organizationOptions[0]._id)} />
                  </>
                ) : (
                  <>
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-gray-300 bg-gray-50",
                      }}
                      name="organization_display"
                      placeholder="Organization"
                      radius="md"
                      size="md"
                      type="text"
                      value={hookLoading ? "Loading..." : "No organization assigned"}
                      variant="bordered"
                      description={hookLoading ? "Please wait for organization to load" : "Contact an administrator to assign an organization to your account"}
                    />
                    {!hookLoading && (
                      <p className="text-xs text-red-500">
                        You need at least one assigned organization to create stakeholders. Contact an administrator.
                      </p>
                    )}
                  </>
                )}
                {!canChooseOrganization && organizationOptions.length > 0 && (
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Organization / Institution (Optional)"
                    name="organization"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                    value={organizationInput}
                    onChange={(e) => setOrganizationInput(e.target.value)}
                    description="Additional organization details"
                  />
                )}
              </div>
            </ModalBody>

            <ModalFooter className="gap-3 px-6 py-6 border-t border-gray-200">
              <Button className="flex-1 font-medium" radius="md" size="md" variant="bordered" onPress={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-black text-white font-medium hover:bg-gray-900"
                color="default"
                isDisabled={isSubmitting}
                radius="md"
                size="md"
                type="submit"
                startContent={isSubmitting ? <Spinner size="sm" color="white" /> : null}
              >
                {isSubmitting ? "Adding Stakeholder..." : "Add Stakeholder"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
