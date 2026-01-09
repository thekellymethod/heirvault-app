"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Terminal, Sparkles, Shield, AlertTriangle } from "lucide-react";

export default function ConsoleGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card p-6 bg-paper-50 border-slateui-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
        type="button"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-gold-600" />
          <h2 className="font-display text-xl font-semibold text-ink-900">
            Console Instruction Guide
          </h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slateui-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slateui-600" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Overview */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-gold-600" />
              <h3 className="font-semibold text-ink-900">Overview</h3>
            </div>
            <p className="text-sm text-slateui-600 mb-3">
              The Admin Console provides a secure, audited interface for executing administrative commands.
              All commands are logged and require proper authentication. The console supports two modes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slateui-600 ml-4">
              <li><strong className="text-ink-900">Command Mode:</strong> Direct command execution with JSON arguments</li>
              <li><strong className="text-ink-900">Natural Language Mode:</strong> AI-powered command generation from plain English</li>
            </ul>
          </section>

          {/* Security Notice */}
          <section className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <h3 className="font-semibold text-red-900">Security & Auditing</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 ml-4">
              <li>All commands are audited and logged with your user ID</li>
              <li>Rate limiting applies: 30 commands per minute per user</li>
              <li>Write operations require explicit confirmation</li>
              <li>Commands are whitelisted - only approved commands can execute</li>
            </ul>
          </section>

          {/* Command Mode */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-gold-600" />
              <h3 className="font-semibold text-ink-900">Command Mode</h3>
            </div>
            <p className="text-sm text-slateui-600 mb-3">
              Execute commands directly by specifying the command name and JSON arguments.
            </p>
            
            <div className="bg-ink-900 rounded-lg p-4 mb-3">
              <div className="text-xs text-paper-100 font-mono space-y-1">
                <div><span className="text-gold-400">Command:</span> <span className="text-paper-100">attorney:verify</span></div>
                <div><span className="text-gold-400">Args:</span> <span className="text-paper-100">{"{"}</span></div>
                <div className="ml-4"><span className="text-paper-100">"userId": "user_123",</span></div>
                <div className="ml-4"><span className="text-paper-100">"licenseStatus": "ACTIVE"</span></div>
                <div><span className="text-paper-100">{"}"}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-ink-900">Available Commands:</h4>
              <div className="space-y-2 text-sm">
                <div className="bg-slateui-50 rounded-lg p-3 border border-slateui-200">
                  <div className="font-mono text-ink-900 font-semibold mb-1">attorney:verify</div>
                  <div className="text-slateui-600 text-xs mb-2">
                    Verify an attorney's license status (ACTIVE, SUSPENDED, or REVOKED)
                  </div>
                  <div className="text-xs text-slateui-600">
                    <strong>Args:</strong> {"{"}"userId": string, "licenseStatus"?: "ACTIVE" | "SUSPENDED" | "REVOKED"{"}"}
                  </div>
                </div>
                <div className="bg-slateui-50 rounded-lg p-3 border border-slateui-200">
                  <div className="font-mono text-ink-900 font-semibold mb-1">attorney:revoke</div>
                  <div className="text-slateui-600 text-xs mb-2">
                    Revoke an attorney's license
                  </div>
                  <div className="text-xs text-slateui-600">
                    <strong>Args:</strong> {"{"}"userId": string{"}"}
                  </div>
                </div>
                <div className="bg-slateui-50 rounded-lg p-3 border border-slateui-200">
                  <div className="font-mono text-ink-900 font-semibold mb-1">user:list</div>
                  <div className="text-slateui-600 text-xs mb-2">
                    List all users in the system
                  </div>
                  <div className="text-xs text-slateui-600">
                    <strong>Args:</strong> {"{}"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Natural Language Mode */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-gold-600" />
              <h3 className="font-semibold text-ink-900">Natural Language Mode</h3>
            </div>
            <p className="text-sm text-slateui-600 mb-3">
              Describe what you want to do in plain English, and the AI will generate the appropriate command.
            </p>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-ink-900">Example Queries:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slateui-600 ml-4">
                <li>"Verify attorney license for user_123"</li>
                <li>"Check who I am"</li>
                <li>"List all users"</li>
                <li>"Revoke attorney license for user_456"</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900">
                  <strong>Note:</strong> Write operations will require confirmation before execution.
                  Review the generated plan carefully, especially the safety flags.
                </div>
              </div>
            </div>
          </section>

          {/* Usage Tips */}
          <section>
            <h3 className="font-semibold text-ink-900 mb-3">Usage Tips</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slateui-600 ml-4">
              <li>Use preset buttons to quickly load common commands</li>
              <li>Command history is preserved during your session</li>
              <li>JSON arguments must be valid JSON objects</li>
              <li>Check the history panel to review previous commands and results</li>
              <li>All commands are rate-limited to prevent abuse</li>
              <li>Errors are displayed in red in the history panel</li>
            </ul>
          </section>

          {/* Preset Commands */}
          <section>
            <h3 className="font-semibold text-ink-900 mb-3">Quick Presets</h3>
            <p className="text-sm text-slateui-600 mb-2">
              Click any preset button to load a command template:
            </p>
            <div className="flex flex-wrap gap-2">
              {["help", "auth:whoami", "db:health", "migrations:status", "logs:recent", "attorney:lookup"].map((cmd) => (
                <span
                  key={cmd}
                  className="px-3 py-1.5 rounded-lg bg-slateui-100 border border-slateui-200 text-xs font-mono text-ink-900"
                >
                  {cmd}
                </span>
              ))}
            </div>
            <p className="text-xs text-slateui-600 mt-2">
              <strong>Note:</strong> Some presets may reference commands that are not yet implemented.
              Check the command list above for available commands.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
