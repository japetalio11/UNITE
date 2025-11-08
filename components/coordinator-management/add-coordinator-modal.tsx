"use client"


import { useState } from "react"
import { X, Users, Eye, EyeOff } from "lucide-react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"


interface AddCoordinatorModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CoordinatorFormData) => void
}


interface CoordinatorFormData {
  coordinatorName: string
  coordinatorEmail: string
  contactNumber: string
  password: string
  retypePassword: string
  province: string
  district: string
}


export default function AddCoordinatorModal({
  isOpen,
  onClose,
  onSubmit,
}: AddCoordinatorModalProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRetypePassword, setShowRetypePassword] = useState(false)


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
   
    const data: CoordinatorFormData = {
      coordinatorName: formData.get("coordinatorName") as string,
      coordinatorEmail: formData.get("coordinatorEmail") as string,
      contactNumber: formData.get("contactNumber") as string,
      password: formData.get("password") as string,
      retypePassword: formData.get("retypePassword") as string,
      province: formData.get("province") as string,
      district: formData.get("district") as string,
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


  const provinces = [
    { key: "camarines-sur", label: "Camarines Sur" },
    { key: "camarines-norte", label: "Camarines Norte" },
  ]


  // District options based on selected province
  const getDistrictOptions = () => {
    if (selectedProvince === "camarines-sur") {
      return [
        { key: "1st", label: "First District" },
        { key: "2nd", label: "Second District" },
        { key: "3rd", label: "Third District" },
        { key: "4th", label: "Fourth District" },
        { key: "5th", label: "Fifth District" },
      ]
    } else if (selectedProvince === "camarines-norte") {
      return [
        { key: "1st", label: "First District" },
        { key: "2nd", label: "Second District" },
      ]
    }
    return []
  }


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      placement="center"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "py-6",
      }}
    >
      <ModalContent>
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
              {/* Coordinator Name Input */}
              <Input
                name="coordinatorName"
                type="text"
                label="Coordinator Name"
                placeholder="Enter coordinator name"
                isRequired
                variant="bordered"
                radius="md"
                size="md"
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
              />


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


              {/* Province and District Row */}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  name="province"
                  label="Province"
                  placeholder="Choose Province"
                  isRequired
                  variant="bordered"
                  radius="md"
                  size="md"
                  selectedKeys={selectedProvince ? [selectedProvince] : []}
                  onSelectionChange={handleProvinceChange}
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    trigger: "border-gray-200",
                  }}
                >
                  {provinces.map((province) => (
                    <SelectItem key={province.key}>
                      {province.label}
                    </SelectItem>
                  ))}
                </Select>


                <Select
                  name="district"
                  label="District"
                  placeholder="Choose District"
                  isRequired
                  variant="bordered"
                  radius="md"
                  size="md"
                  isDisabled={!selectedProvince}
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    trigger: "border-gray-200",
                  }}
                >
                  {getDistrictOptions().map((district) => (
                    <SelectItem key={district.key}>
                      {district.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </ModalBody>


            <ModalFooter className="pt-4 pb-6 gap-3">
              <Button
                type="button"
                variant="bordered"
                onPress={onClose}
                radius="lg"
                size="lg"
                className="flex-1 border-gray-300 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="default"
                radius="lg"
                size="lg"
                className="flex-1 bg-black text-white font-medium"
              >
                Add Coordinator
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
