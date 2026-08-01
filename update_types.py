import sys

def main():
    with open('types.ts', 'r') as f:
        content = f.read()

    app_settings_def = """
export interface AppSettings {
  leadSources: string[];
  personTypes: string[];
  constructionStages: string[];
  telemetryEnabled?: boolean;
  trainDispatchIntervalMs?: number;
  heartbeatIntervalMs?: number;
  trainCutoverTimestamp?: number;
  isSeeded?: boolean;
}
"""

    # Let's find 'export type View = ' and insert AppSettings after its definition
    target = "export type View = 'dashboard' | 'upload' | 'gallery' | 'pending' | 'admin' | 'profile' | 'followups' | 'odometer' | 'route_tracker' | 'analytics' | 'escalations';"
    if target in content:
        pos = content.find(target) + len(target)
        content = content[:pos] + "\n" + app_settings_def + content[pos:]
        with open('types.ts', 'w') as f:
            f.write(content)
        print("Successfully updated types.ts with AppSettings interface")
    else:
        print("Target view string not found in types.ts")

if __name__ == '__main__':
    main()
