"use client"

import { useState, useEffect } from "react";
import { Persons as Users, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons";
import { X } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

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
  coordinatorName?: string
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
  const [provinces, setProvinces] = useState<any[]>([])
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [provincesError, setProvincesError] = useState<string | null>(null)

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
      coordinatorName: [firstName, middleName, lastName].filter(Boolean).join(" "),
      coordinatorEmail: formData.get("coordinatorEmail") as string,
      contactNumber: formData.get("contactNumber") as string,
      password: formData.get("password") as string,
      retypePassword: formData.get("retypePassword") as string,
      province: selectedProvince,
      district: formData.get("district") as string,
      districtId: selectedDistrictId,
    }

    if (data.password !== data.retypePassword) {
      alert("Passwords do not match!")
      return
    }

    if (!data.province || !data.district) {
      alert("Please select a Province and District before submitting.")
      return
    }

    onSubmit(data)
  }

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setProvincesLoading(true)
      setProvincesError(null)
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = base ? `${base}/api/locations/provinces` : `/api/locations/provinces`
        let token = null

        try {
          token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        } catch (e) {
          token = null
        }
        const headers: any = {}

        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch(url, { headers })
        const bodyText = await res.text()
        let body: any = null

        try {
          body = bodyText ? JSON.parse(bodyText) : null
        } catch {
          throw new Error("Invalid JSON from provinces endpoint")
        }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch provinces (status ${res.status})`)
        const items = body.data || body.provinces || []
        const normalized = items.map((p: any) => ({
          id: p._id || p.id || p._doc?._id || p.id,
          name: p.name || p.Name || p.Province_Name || p.Province_Name,
        }))

        setProvinces(normalized.filter(Boolean))
      } catch (err: any) {
        setProvincesError(err.message || "Failed to load provinces")
      } finally {
        setProvincesLoading(false)
      }
    }

    fetchProvinces()
  }, [])

  // Fetch districts for selected province
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([])
      setSelectedDistrictId("")
      return
    }

    const fetchDistricts = async () => {
      setDistrictsLoading(true)
      setDistrictsError(null)
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = base
          ? `${base}/api/locations/provinces/${encodeURIComponent(selectedProvince)}/districts?limit=1000`
          : `/api/locations/provinces/${encodeURIComponent(selectedProvince)}/districts?limit=1000`

        let token = null

        try {
          token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        } catch (e) {
          token = null
        }

        const headers: any = {}

        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch(url, { headers })
        const bodyText = await res.text()
        let body: any = null

        try {
          body = bodyText ? JSON.parse(bodyText) : null
        } catch {
          throw new Error("Invalid JSON from districts endpoint")
        }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch districts (status ${res.status})`)
        const items = body.data || body.districts || []
        const normalized = items.map((d: any) => ({
          id: d._id || d.id || d.District_ID,
          name: d.name || d.Name || d.District_Name || d.District_Number,
        }))

        setDistricts(normalized.filter(Boolean))
      } catch (err: any) {
        setDistrictsError(err.message || "Failed to load districts")
      } finally {
        setDistrictsLoading(false)
      }
    }

    fetchDistricts()
  }, [selectedProvince])

  return (
    <Modal
      classNames={{
        base: "max-w-[580px]",
        backdrop: "bg-black/50"
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      hideCloseButton
      onClose={onClose}
    >
      <ModalContent className="max-h-[90vh]">
        {(onClose) => (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Custom Header with Close Button */}
            <div className="flex items-start justify-between px-6 pt-4 pb-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="w-4 h-4 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Coordinator</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Please enter the coordinator's information below to add them to the system.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ModalBody className="gap-3.5 px-6 py-4 overflow-y-auto flex-1">
              {/* Coordinator Name - 3 columns */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Coordinator Name <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                      input: "text-sm placeholder:text-gray-400"
                    }}
                    name="firstName"
                    placeholder="First name"
                    radius="lg"
                    variant="bordered"
                  />
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                      input: "text-sm placeholder:text-gray-400"
                    }}
                    name="middleName"
                    placeholder="Middle name"
                    radius="lg"
                    variant="bordered"
                  />
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                      input: "text-sm placeholder:text-gray-400"
                    }}
                    name="lastName"
                    placeholder="Last name"
                    radius="lg"
                    variant="bordered"
                  />
                </div>
              </div>

              {/* Coordinator Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Coordinator Email <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                    input: "text-sm placeholder:text-gray-400"
                  }}
                  name="coordinatorEmail"
                  placeholder="Enter coordinator email"
                  radius="lg"
                  type="email"
                  variant="bordered"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                    input: "text-sm placeholder:text-gray-400"
                  }}
                  name="contactNumber"
                  placeholder="Enter contact number"
                  radius="lg"
                  type="tel"
                  variant="bordered"
                />
              </div>

              {/* Set Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Set Password <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                    input: "text-sm placeholder:text-gray-400"
                  }}
                  endContent={
                    <button 
                      className="focus:outline-none" 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  }
                  name="password"
                  placeholder="Set password"
                  radius="lg"
                  type={showPassword ? "text" : "password"}
                  variant="bordered"
                />
              </div>

              {/* Retype Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Retype Password <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                    input: "text-sm placeholder:text-gray-400"
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
                  name="retypePassword"
                  placeholder="Retype password"
                  radius="lg"
                  type={showRetypePassword ? "text" : "password"}
                  variant="bordered"
                />
              </div>

              {/* Province and District - 2 col */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Province</label>
                  <Select
                    isRequired
                    classNames={{
                      trigger: "border-gray-300 bg-white shadow-sm h-10",
                      value: "text-sm text-gray-900"
                    }}
                    name="province"
                    placeholder="Choose Province"
                    radius="lg"
                    selectedKeys={selectedProvince ? [selectedProvince] : []}
                    variant="bordered"
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string
                      setSelectedProvince(id)
                    }}
                  >
                    {provinces.map((prov) => (
                      <SelectItem key={String(prov.id)} textValue={String(prov.name)}>
                        {String(prov.name)}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">District</label>
                  <Select
                    isRequired
                    classNames={{
                      trigger: "border-gray-300 bg-white shadow-sm h-10",
                      value: "text-sm text-gray-900"
                    }}
                    name="district"
                    placeholder="Choose District"
                    radius="lg"
                    selectedKeys={selectedDistrictId ? [selectedDistrictId] : []}
                    variant="bordered"
                    isDisabled={!selectedProvince}
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string
                      setSelectedDistrictId(id)
                    }}
                  >
                    {districts.map((district) => (
                      <SelectItem key={String(district.id)} textValue={String(district.name)}>
                        {String(district.name)}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <input name="district" type="hidden" value={selectedDistrictId} />
                <input name="province" type="hidden" value={selectedProvince} />
              </div>
            </ModalBody>

            <ModalFooter className="px-6 pb-5 pt-3 gap-3 border-t border-gray-100 flex-shrink-0">
              <Button
                className="flex-1 h-11 border-gray-300 font-medium text-sm bg-white hover:bg-gray-50"
                radius="lg"
                type="button"
                variant="bordered"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-black text-white font-medium text-sm hover:bg-gray-800"
                radius="lg"
                isDisabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Adding..." : "Add Coordinator"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
