import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ScanEye, FileText, Copy, Route, Gift, MapPin, BarChart3, ShieldCheck,
  ArrowRight, Camera, Brain, Building2, CheckCircle2, Star, ChevronDown,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { FAQS, TESTIMONIALS } from '@/data/mockData';
import { useState } from 'react';

const features = [
  { icon: ScanEye, title: 'AI Detection', desc: 'YOLO-powered object detection identifies potholes, vehicles, and violations from photos automatically.' },
  { icon: FileText, title: 'OCR', desc: 'Reads vehicle number plates from evidence photos using EasyOCR for traffic violation enforcement.' },
  { icon: Copy, title: 'Duplicate Detection', desc: 'Smart clustering prevents redundant reports by matching location, category, and visual similarity.' },
  { icon: Route, title: 'Smart Routing', desc: 'Automatically assigns reports to the correct department based on category and severity analysis.' },
  { icon: Gift, title: 'Rewards', desc: 'Earn points, badges, and climb levels. Gamified civic engagement that rewards responsible citizens.' },
  { icon: MapPin, title: 'Live Maps', desc: 'Interactive map with real-time incident markers, severity colours, filters, and heatmap visualisation.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Comprehensive dashboards showing trends, department performance, and critical areas needing attention.' },
  { icon: ShieldCheck, title: 'Transparency', desc: 'Track every report from submission to resolution. Full visibility into government response times.' },
];

const stats = [
  { label: 'Reports Submitted', value: 48520, suffix: '+' },
  { label: 'Verified Reports', value: 41200, suffix: '+' },
  { label: 'Roads Repaired', value: 8740, suffix: '+' },
  { label: 'Traffic Violations', value: 12600, suffix: '+' },
  { label: 'Active Citizens', value: 15800, suffix: '+' },
];

const workflow = [
  { icon: Camera, title: 'Upload Evidence', desc: 'Capture photos, videos, or record a voice note with GPS and timestamp.' },
  { icon: Brain, title: 'AI Verification', desc: 'AI analyses evidence for quality, objects, violations, and duplicates.' },
  { icon: Route, title: 'Department Routing', desc: 'Report is automatically assigned to the correct department.' },
  { icon: Building2, title: 'Issue Resolution', desc: 'Department acts on the report and updates status in real-time.' },
  { icon: Gift, title: 'Citizen Rewards', desc: 'Earn points, badges, and climb the leaderboard for verified reports.' },
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/30 dark:bg-blue-600/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-emerald-300/20 dark:bg-emerald-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="section-padding relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI-Powered Civic Platform
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight text-balance">
                Building Smarter <span className="gradient-text">Cities</span> with AI
              </h1>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Report potholes, traffic violations, and civic issues in seconds. Our AI verifies evidence, routes to departments, and rewards you for making your city better.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/report" className="btn-primary text-base px-7 py-3.5">
                  Report Issue <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#features" className="btn-secondary text-base px-7 py-3.5">
                  Learn More
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free to use</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Earn rewards</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real impact</div>
              </div>
            </motion.div>

            {/* Animated city illustration placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5" />
                <div className="relative">
                  {/* Mock dashboard preview */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs text-slate-400">Live Dashboard</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="glass-card p-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Reports Today</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">248</p>
                      <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ delay: 1, duration: 1 }} className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
                      </div>
                    </div>
                    <div className="glass-card p-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">AI Accuracy</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">94%</p>
                      <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} transition={{ delay: 1.2, duration: 1 }} className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: 'Pothole · MG Road', status: 'Verified', color: 'bg-emerald-500' },
                      { label: 'Helmet Missing · Brigade Rd', status: 'Assigned', color: 'bg-blue-500' },
                      { label: 'Garbage · Indiranagar', status: 'Resolved', color: 'bg-green-500' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.15 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.color}`} />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.status}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 glass-card px-4 py-2 flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">+150 points</span>
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 glass-card px-4 py-2 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Trust Score 92</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white dark:bg-slate-900/50">
        <div className="section-padding">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl lg:text-4xl font-bold gradient-text">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">Everything you need to <span className="gradient-text">fix your city</span></h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">From AI-powered evidence analysis to gamified rewards — a complete civic engagement platform.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="glass-card glass-card-hover p-6 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-20 lg:py-28 bg-white dark:bg-slate-900/50">
        <div className="section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">How <span className="gradient-text">CivicEye AI</span> Works</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">From evidence to resolution in five simple steps.</p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-emerald-200 to-blue-200 dark:from-blue-800 dark:via-emerald-800 dark:to-blue-800" />
            <div className="grid lg:grid-cols-5 gap-6">
              {workflow.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="relative text-center"
                >
                  <div className="relative inline-flex">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28">
        <div className="section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">Loved by <span className="gradient-text">active citizens</span></h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">Join thousands of citizens making their cities better every day.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28 bg-white dark:bg-slate-900/50">
        <div className="section-padding max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">Frequently Asked <span className="gradient-text">Questions</span></h2>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="section-padding">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-10 lg:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10" />
            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">Ready to make your <span className="gradient-text">city smarter?</span></h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-xl mx-auto">Join thousands of citizens reporting issues, earning rewards, and driving real change in their communities.</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register" className="btn-primary text-base px-7 py-3.5">Get Started Free <ArrowRight className="w-5 h-5" /></Link>
                <Link to="/login" className="btn-secondary text-base px-7 py-3.5">Sign In</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
