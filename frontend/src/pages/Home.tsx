import { motion } from 'framer-motion'
import { ArrowRight, Database, GitBranch, Lock, Rocket, TrendingUp, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">FlowPay</span>
          </div>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-slate-300 hover:text-white transition"
            >
              Login
            </Link>
            <Link
              to="/login"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-block px-4 py-2 bg-blue-900/50 border border-blue-500/50 rounded-full">
              <span className="text-blue-300 text-sm font-semibold">🚀 Programmable Payments</span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent"
          >
            Event-Driven Micropayments
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-slate-400 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Harness the power of Stellar blockchain to build continuous payment streams that reward engagement in
            real-time. No delays. No intermediaries. Pure programmable finance.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/login"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              Launch App <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="px-8 py-3 border border-blue-500 hover:bg-blue-900/30 rounded-lg font-semibold transition"
            >
              Learn More
            </a>
          </motion.div>

          {/* Hero Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12">
            {[
              { label: 'Sub-cent Transactions', value: '$0.001+' },
              { label: 'Instant Settlement', value: '4-5 sec' },
              { label: 'Global Reach', value: '180+ Countries' },
            ].map((stat, i) => (
              <div key={i} className="border border-slate-700 rounded-lg p-6 bg-slate-800/50">
                <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-blue-400">{stat.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Why FlowPay?</h2>
              <p className="text-slate-400 text-lg">
                Purpose-built for programmable payments on the Stellar network
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Zap className="w-8 h-8" />,
                  title: 'Drip Payments',
                  description:
                    'Distribute value continuously over time instead of lump sums. Create ongoing reward streams for engagement.',
                },
                {
                  icon: <TrendingUp className="w-8 h-8" />,
                  title: 'Event-Driven',
                  description:
                    'Trigger payments automatically based on real-world events. Lesson completed? Payment flows instantly.',
                },
                {
                  icon: <Lock className="w-8 h-8" />,
                  title: 'Secure by Design',
                  description:
                    'JWT authentication, encrypted keys, Soroban smart contract validation. Security at every layer.',
                },
                {
                  icon: <GitBranch className="w-8 h-8" />,
                  title: 'Workflow Automation',
                  description:
                    'Build complex payment logic without code. Conditions, actions, and integrations combined effortlessly.',
                },
                {
                  icon: <Database className="w-8 h-8" />,
                  title: 'Real-Time Analytics',
                  description:
                    'Monitor workflows, drips, and transactions in real-time. Dashboard updates as payments flow.',
                },
                {
                  icon: <Rocket className="w-8 h-8" />,
                  title: 'Global Scale',
                  description:
                    'Built on Stellar infrastructure. Reach users in 180+ countries with no geographic limitations.',
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="p-6 bg-slate-900 border border-slate-700 hover:border-blue-500/50 rounded-lg transition hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="text-blue-400 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
              How It Works
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[
                {
                  step: '01',
                  title: 'Create Workflows',
                  description:
                    'Define events that trigger payments. Set conditions, choose actions, and watch payments execute automatically.',
                  code: `{
  "trigger": "lesson-completed",
  "conditions": ["score >= 80"],
  "action": "startDrip"
}`,
                },
                {
                  step: '02',
                  title: 'Setup Drips',
                  description:
                    'Configure continuous payment streams. Set amount, frequency, and duration. Payments distribute over time.',
                  code: `{
  "amount": 0.10,
  "currency": "XLM",
  "frequency": "daily",
  "duration": 30
}`,
                },
                {
                  step: '03',
                  title: 'Trigger Events',
                  description:
                    'Send events via webhook or API. FlowPay evaluates conditions and executes payments on Stellar.',
                  code: `POST /hooks/lesson-completed
{
  "userId": "123",
  "score": 92,
  "courseId": "react-basics"
}`,
                },
                {
                  step: '04',
                  title: 'Monitor & Analyze',
                  description:
                    'Watch real-time dashboard. Track workflows, drips, and transactions. See every payment flow.',
                  code: `Dashboard.watch({
  transactions: ↑ $1,234.56,
  workflows: ↑ 5 active,
  drips: ↑ 12 running
})`,
                },
              ].map((item, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-4xl font-bold text-blue-500">{item.step}</div>
                    <div>
                      <h3 className="text-2xl font-bold">{item.title}</h3>
                      <p className="text-slate-400 mt-2">{item.description}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
                    <pre>{item.code}</pre>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 border-t border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-4">
              Built on Modern Tech
            </motion.h2>
            <motion.p variants={itemVariants} className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
              Production-grade stack designed for scale, security, and performance.
            </motion.p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[
                { name: 'React 19', desc: 'UI Framework' },
                { name: 'TypeScript', desc: 'Type Safety' },
                { name: 'NestJS', desc: 'Backend' },
                { name: 'PostgreSQL', desc: 'Database' },
                { name: 'Stellar SDK', desc: 'Payments' },
                { name: 'Soroban', desc: 'Smart Contracts' },
                { name: 'Tailwind CSS', desc: 'Styling' },
                { name: 'Vite', desc: 'Build Tool' },
              ].map((tech, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-center hover:border-blue-500/50 transition"
                >
                  <p className="font-bold text-lg">{tech.name}</p>
                  <p className="text-slate-400 text-sm">{tech.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-12">
              Decoupled Architecture
            </motion.h2>

            <motion.div variants={itemVariants} className="bg-slate-900 border border-slate-700 rounded-lg p-8">
              <div className="space-y-8">
                {[
                  {
                    layer: 'Frontend',
                    tech: 'React + Vite + TypeScript',
                    features: ['Authentication UI', 'Workflow Builder', 'Dashboard', 'Real-time Updates'],
                    color: 'blue',
                  },
                  {
                    layer: 'Backend',
                    tech: 'NestJS + Node.js',
                    features: ['Event Processing', 'Workflow Engine', 'Transaction Signing', 'Database'],
                    color: 'cyan',
                  },
                  {
                    layer: 'Blockchain',
                    tech: 'Stellar + Soroban',
                    features: ['Payment Validation', 'Asset Management', 'Global Settlement'],
                    color: 'emerald',
                  },
                ].map((layer, i) => (
                  <div key={i} className="flex items-start gap-6 pb-8 border-b border-slate-700 last:border-b-0">
                    <div className={`w-24 h-24 bg-${layer.color}-900/30 border border-${layer.color}-500/50 rounded-lg flex items-center justify-center`}>
                      <span className="text-lg font-bold text-center">{layer.layer}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold text-${layer.color}-400`}>{layer.tech}</h3>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {layer.features.map((feature, j) => (
                          <span key={j} className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 border-t border-slate-700 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-12">
              Real-World Use Cases
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: 'EdTech Platforms',
                  description: 'Reward students with drip payments for lesson completion. Increase engagement with continuous incentives.',
                  example: 'Student completes lesson → Drip: $0.10 XLM/day for 30 days',
                },
                {
                  title: 'Creator Economy',
                  description:
                    'Creators receive micropayments instantly for content consumption, subscriptions, or tips.',
                  example: 'Video watched → Creator receives XLM payment automatically',
                },
                {
                  title: 'API Monetization',
                  description: 'Pay developers per API call or data transfer. Usage-based pricing made affordable.',
                  example: 'API call → Automatic micropayment to developer wallet',
                },
                {
                  title: 'Referral Programs',
                  description:
                    'Automated commission streams for successful referrals. Drip rewards over time as referred user stays active.',
                  example: 'User referred → Drip: Commission distributed weekly',
                },
              ].map((useCase, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500/50 transition"
                >
                  <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                  <p className="text-slate-400 mb-4">{useCase.description}</p>
                  <div className="px-3 py-2 bg-slate-800 rounded text-sm text-blue-300 font-mono">
                    {useCase.example}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold mb-6">
              Ready to Build Programmable Payments?
            </motion.h2>

            <motion.p variants={itemVariants} className="text-xl text-slate-400 mb-8">
              Launch your first workflow in minutes. No credit card required. Testnet funds provided.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition"
              >
                Get Started Now <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://github.com/LawalRahman/flowpay"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border border-blue-500 hover:bg-blue-900/30 rounded-lg font-bold text-lg transition"
              >
                View on GitHub
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-blue-500" />
                <span className="font-bold">FlowPay</span>
              </div>
              <p className="text-slate-400 text-sm">Event-driven micropayments on Stellar</p>
            </div>
            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Docs', 'API Reference'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'GitHub', 'Twitter'],
              },
              {
                title: 'Resources',
                links: ['Documentation', 'Tutorials', 'Community', 'Support'],
              },
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-bold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-slate-400 hover:text-white transition text-sm">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-8 flex justify-between items-center">
            <p className="text-slate-400 text-sm">&copy; 2026 FlowPay. All rights reserved.</p>
            <div className="flex gap-4">
              {['Twitter', 'GitHub', 'Discord'].map((social, i) => (
                <a key={i} href="#" className="text-slate-400 hover:text-white transition">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
