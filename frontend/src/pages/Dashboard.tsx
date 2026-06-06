import { motion } from 'framer-motion'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: 'Total Earnings', value: '$1,234.56', color: 'from-green-400 to-green-600' },
            { title: 'Active Workflows', value: '5', color: 'from-blue-400 to-blue-600' },
            { title: 'Total Drips', value: '12', color: 'from-purple-400 to-purple-600' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-r ${stat.color} rounded-lg shadow-lg p-6 text-white`}
            >
              <p className="text-gray-100 text-sm">{stat.title}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
            <p className="text-gray-500">No transactions yet</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg mb-3">
              Create Workflow
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">
              Start Drip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
