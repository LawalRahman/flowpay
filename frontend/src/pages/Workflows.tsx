export default function Workflows() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Workflows</h1>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            New Workflow
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-500">No workflows created yet</p>
        </div>
      </div>
    </div>
  )
}
