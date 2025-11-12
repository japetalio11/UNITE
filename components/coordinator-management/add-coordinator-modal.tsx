"use client"


import { useState, useEffect } from "react"
import { X, Users, Eye, EyeOff } from "lucide-react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"


interface AddCoordinatorModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CoordinatorFormData) => void
  isSubmitting?: boolean
}


interface CoordinatorFormData {
  firstName: string
  middleName?: string
  lastName: string
  coordinatorName?: string // optional assembled name
  coordinatorEmail: string
  contactNumber: string
  password: string
  retypePassword: string
  province: string
  district: string
  districtId?: string
}


export default function AddCoordinatorModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddCoordinatorModalProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("")
  const [districts, setDistricts] = useState<any[]>([])
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [districtsError, setDistrictsError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showRetypePassword, setShowRetypePassword] = useState(false)


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const firstName = (formData.get("firstName") || "").toString()
    const middleName = (formData.get("middleName") || "").toString()
    const lastName = (formData.get("lastName") || "").toString()

    const data: CoordinatorFormData = {
      firstName,
      middleName,
      lastName,
      coordinatorName: [firstName, middleName, lastName].filter(Boolean).join(' '),
      coordinatorEmail: formData.get("coordinatorEmail") as string,
      contactNumber: formData.get("contactNumber") as string,
      password: formData.get("password") as string,
      retypePassword: formData.get("retypePassword") as string,
      province: selectedProvince,
      district: formData.get("district") as string,
      districtId: selectedDistrictId
    }
   
    // Validate passwords match
    if (data.password !== data.retypePassword) {
      alert("Passwords do not match!")
      return
    }
   
    onSubmit(data)
  }


  const handleProvinceChange = (keys: any) => {
    const province = Array.from(keys)[0] as string
    setSelectedProvince(province)
  }


  const provinces = Array.from(new Set(districts.map((d) => d.Province_Name))).map((p) => ({ key: p, label: p }))

  // Fetch districts from backend on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      setDistrictsLoading(true)
      setDistrictsError(null)
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
        const url = base ? `${base}/api/districts?limit=1000` : `/api/districts?limit=1000`
        let token = null
        try { token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token') } catch (e) { token = null }
        const headers: any = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(url, { headers })
        const bodyText = await res.text()
        let body: any = null
        try { body = bodyText ? JSON.parse(bodyText) : null } catch { throw new Error('Invalid JSON from districts endpoint') }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch districts (status ${res.status})`)
        const items = body.data || []
        setDistricts(items)
      } catch (err: any) {
        setDistrictsError(err.message || 'Failed to load districts')
      } finally {
        setDistrictsLoading(false)
      }
    }
    fetchDistricts()
  }, [])


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      placement="center"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[95vh]",
        body: "py-6",
      }}
    >
      <ModalContent className="w-full max-w-[980px]">
        {(onClose) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gray-100 rounded-lg">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Add Coordinator</h2>
                </div>
              </div>
              <p className="text-sm font-normal text-gray-500 mt-2 ml-0">
                Please enter the coordinator's information below to add them to the system.
              </p>
            </ModalHeader>
           
            <ModalBody className="gap-5 py-6">
              {/* First / Middle / Last Name Inputs (middle optional) */}
              <div className="grid grid-cols-3 gap-4">
                <Input
                  name="firstName"
                  type="text"
                  label="First Name"
                  placeholder="First name"
                  isRequired
                  variant="bordered"
                  radius="md"
                  size="md"
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                />
                <Input
                  name="middleName"
                  type="text"
                  label="Middle Name"
                  placeholder="Middle name (optional)"
                  isRequired={false}
                  variant="bordered"
                  radius="md"
                  size="md"
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                />
                <Input
                  name="lastName"
                  type="text"
                  label="Last Name"
                  placeholder="Last name"
                  isRequired
                  variant="bordered"
                  radius="md"
                  size="md"
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                />
              </div>


              {/* Coordinator Email Input */}
              <Input
                name="coordinatorEmail"
                type="email"
                label="Coordinator Email"
                placeholder="Enter coordinator email"
                isRequired
                variant="bordered"
                radius="md"
                size="md"
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
              />


              {/* Contact Number Input */}
              <Input
                name="contactNumber"
                type="tel"
                label="Contact Number"
                placeholder="Enter contact number"
                isRequired
                variant="bordered"
                radius="md"
                size="md"
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
              />


              {/* Set Password Input */}
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                label="Set Password"
                placeholder="Set password"
                isRequired
                variant="bordered"
                radius="md"
                size="md"
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                }
              />


              {/* Retype Password Input */}
              <Input
                name="retypePassword"
                type={showRetypePassword ? "text" : "password"}
                label="Retype Password"
                placeholder="Enter contact number"
                isRequired
                variant="bordered"
                radius="md"
                size="md"
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowRetypePassword(!showRetypePassword)}
                    className="focus:outline-none"
                  >
                    {showRetypePassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                }
              />


              {/* District (left) and Province (right). Province is auto-filled and read-only based on district selection */}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  name="district"
                  label="District"
                  placeholder={districtsLoading ? 'Loading districts...' : 'Choose District'}
                  isRequired
                  variant="bordered"
                  radius="md"
                  size="md"
                  selectedKeys={selectedDistrictId ? [selectedDistrictId] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string
                    setSelectedDistrictId(id)
                    const d = districts.find((x) => (x.District_ID === id) || (x.District_ID === id))
                    if (d) setSelectedProvince(d.Province_Name || '')
                  }}
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    trigger: "border-gray-200",
                  }}
                >
                  {districts.map((district) => (
                    <SelectItem key={district.District_ID}>
                      {district.District_Name || district.District_Number || district.District_ID}
                    </SelectItem>
                  ))}
                </Select>

                {/* Province is shown and cannot be modified directly */}
                <Input
                  name="province"
                  type="text"
                  label="Province"
                  placeholder="Province"
                  value={selectedProvince}
                  isRequired
                  disabled
                  variant="bordered"
                  radius="md"
                  size="md"
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200 bg-gray-50",
                  }}
                />

                {/* Hidden inputs so FormData includes these values on submit */}
                <input type="hidden" name="district" value={selectedDistrictId} />
                <input type="hidden" name="province" value={selectedProvince} />
              </div>
            </ModalBody>


            <ModalFooter className="pt-4 pb-6 gap-3 justify-end">
              <Button
                type="button"
                variant="bordered"
                onPress={onClose}
                radius="md"
                size="md"
                className="w-36 px-3 py-2 border-gray-300 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="default"
                radius="md"
                size="md"
                className="w-36 px-3 py-2 bg-black text-white font-medium"
                isDisabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Coordinator'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
