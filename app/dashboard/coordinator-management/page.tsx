"use client"


import { useState } from "react"
import Topbar from "@/components/topbar"
import CoordinatorToolbar from "@/components/coordinator-management/coordinator-management-toolbar"
import CoordinatorTable from "@/components/coordinator-management/coordinator-management-table"
import AddCoordinatorModal from "@/components/coordinator-management/add-coordinator-modal"


interface CoordinatorFormData {
  coordinatorName: string
  coordinatorEmail: string
  contactNumber: string
  password: string
  retypePassword: string
  province: string
  district: string
}


export default function CoordinatorManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)


  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }


  const handleUserClick = () => {
    console.log("User profile clicked")
  }


  const handleExport = () => {
    console.log("Exporting data...")
  }


  const handleQuickFilter = () => {
    console.log("Opening quick filter...")
  }


  const handleAdvancedFilter = () => {
    console.log("Opening advanced filter...")
  }


  const handleAddCoordinator = () => {
    setIsAddModalOpen(true)
  }


  const handleModalClose = () => {
    setIsAddModalOpen(false)
  }


  const handleModalSubmit = (data: CoordinatorFormData) => {
    console.log("New coordinator data:", data)
    // Add your API call here to save the coordinator
    // Example: await createCoordinator(data)
    setIsAddModalOpen(false)
  }


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoordinators(coordinators.map((c) => c.id))
    } else {
      setSelectedCoordinators([])
    }
  }


  const handleSelectCoordinator = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCoordinators([...selectedCoordinators, id])
    } else {
      setSelectedCoordinators(selectedCoordinators.filter((cId) => cId !== id))
    }
  }


  const handleActionClick = (id: string) => {
    console.log("Action clicked for coordinator:", id)
  }


  // Mock data
  const coordinators = [
    {
      id: "1",
      name: "Joseph Angelo Q. Petallo",
      email: "jpetallo@gmail.com",
      phone: "12345678",
      province: "Camarines Sur",
      district: "1st District",
    },
    {
      id: "2",
      name: "Patrick Kurt O. Villamer",
      email: "pvillamer@gmail.com",
      phone: "12345678",
      province: "Camarines Sur",
      district: "2nd District",
    },
    {
      id: "3",
      name: "Marc Lester E. Sulit",
      email: "msulit@gmail.com",
      phone: "12345678",
      province: "Camarines Sur",
      district: "3rd District",
    },
    {
      id: "4",
      name: "Samuel F. Belen",
      email: "sbelen@gmail.com",
      phone: "12345678",
      province: "Camarines Sur",
      district: "4th District",
    },
    {
      id: "5",
      name: "Kurt Anjelo M. Sereno",
      email: "ksereno@gmail.com",
      phone: "12345678",
      province: "Camarines Sur",
      district: "5th District",
    },
    {
      id: "6",
      name: "Gryan A. Bercasio",
      email: "gbercasio@gmail.com",
      phone: "12345678",
      province: "Camarines Norte",
      district: "1st District",
    },
    {
      id: "7",
      name: "Adrian Leo T. Pajarillo",
      email: "apajarillo@gmail.com",
      phone: "12345678",
      province: "Camarines Norte",
      district: "2nd District",
    },
  ]


  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Coordinator Management</h1>
      </div>


      {/* Topbar Component */}
      <Topbar
        userName="Bicol Medical Center"
        userEmail="bmc@gmail.com"
        onUserClick={handleUserClick}
      />


      {/* Toolbar with Search and Actions */}
      <CoordinatorToolbar
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onAdvancedFilter={handleAdvancedFilter}
        onAddCoordinator={handleAddCoordinator}
        onSearch={handleSearch}
      />


      {/* Table Content */}
      <div className="px-6 py-4 bg-gray-50">
        <CoordinatorTable
          coordinators={coordinators}
          selectedCoordinators={selectedCoordinators}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectCoordinator}
          //onActionClick={handleActionClick}
          searchQuery={searchQuery} onActionClick={function (id: string): void {
            throw new Error("Function not implemented.")
          } }        />
      </div>


      {/* Add Coordinator Modal */}
      <AddCoordinatorModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </div>
  )
}
