import { Link } from 'react-router-dom';
import { Eye, Github, Twitter, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 mt-20">
      <div className="section-padding">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold text-white">CivicEye<span className="text-blue-400"> AI</span></span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-powered civic reporting platform for smarter cities. Report, track, and resolve infrastructure and traffic issues.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/report" className="hover:text-blue-400 transition-colors">Report an Issue</Link></li>
              <li><Link to="/map" className="hover:text-blue-400 transition-colors">Live Map</Link></li>
              <li><Link to="/leaderboard" className="hover:text-blue-400 transition-colors">Leaderboard</Link></li>
              <li><Link to="/analytics" className="hover:text-blue-400 transition-colors">Analytics</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/#features" className="hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="/#workflow" className="hover:text-blue-400 transition-colors">How It Works</a></li>
              <li><a href="/#faq" className="hover:text-blue-400 transition-colors">FAQ</a></li>
              <li><Link to="/register" className="hover:text-blue-400 transition-colors">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Connect</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><Github className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><Linkedin className="w-4 h-4" /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><Mail className="w-4 h-4" /></a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">© 2025 CivicEye AI. Built for a smarter tomorrow.</p>
          <p className="text-sm text-slate-400">Made with care for citizens nationwide</p>
        </div>
      </div>
    </footer>
  );
}
