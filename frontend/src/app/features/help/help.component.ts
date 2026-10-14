import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type GuideIcon = 'start' | 'navigation' | 'hub' | 'livestock' | 'supply' | 'finance' | 'governance' | 'reporting' | 'settings' | 'quality';

interface GuideLink {
  label: string;
  route: string;
}

interface GuideStep {
  title: string;
  body: string;
  bullets?: string[];
  links?: GuideLink[];
}

interface HelpGuide {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  icon: GuideIcon;
  audience: string;
  route?: string;
  routeLabel?: string;
  steps: GuideStep[];
  tips: string[];
}

interface HelpFaq {
  id: string;
  question: string;
  answer: string;
  links?: GuideLink[];
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})
export class HelpComponent {
  searchTerm = '';
  activeGuideId = 'getting-started';
  expandedFaqId = 'session';

  readonly quickStart = [
    { number: '01', title: 'Capture the work', text: 'Record births, deaths, health cases, treatments and purchase requests as they happen.', route: '/hub' },
    { number: '02', title: 'Follow the record', text: 'Open the relevant workspace to review status, owners, dates and next actions.', route: '/livestock' },
    { number: '03', title: 'Review the signal', text: 'Use CEO Command and reports to turn daily records into decisions.', route: '/ceo' },
    { number: '04', title: 'Protect the session', text: 'Sign out when finished. The app also signs you out after 10 minutes idle.', route: '/settings' }
  ];

  readonly roleStartingPoints = [
    {
      role: 'Farm & operations',
      description: 'Start with Hub, Livestock, Health, Treatments, Breeding and Feed.',
      route: '/hub',
      label: 'Open operations'
    },
    {
      role: 'Finance & procurement',
      description: 'Review requests, expenses, invoices, payments and finance reports.',
      route: '/finance',
      label: 'Open finance'
    },
    {
      role: 'Leadership & governance',
      description: 'Begin with CEO Command, then follow alerts, risks and pending decisions.',
      route: '/ceo',
      label: 'Open command'
    }
  ];

  readonly guides: HelpGuide[] = [
    {
      id: 'getting-started',
      eyebrow: 'Start here',
      title: 'Your first five minutes in Evolex Hub',
      summary: 'A simple path from signing in to recording useful, reviewable work.',
      icon: 'start',
      audience: 'Everyone',
      route: '/hub',
      routeLabel: 'Open Hub',
      steps: [
        {
          title: 'Sign in and confirm your workspace',
          body: 'Use the account assigned to you. After signing in, Evolex opens the authenticated workspace and keeps your role and profile visible in the top-right menu.',
          bullets: [
            'Confirm that the name and role shown in the profile menu are yours.',
            'If the page returns to Login, sign in again before entering records.'
          ]
        },
        {
          title: 'Choose Hub for daily work or CEO Command for oversight',
          body: 'Hub is the practical starting point for quick entries and workspace shortcuts. CEO Command is the executive view for headline KPIs, attention items and cross-functional signals.',
          links: [
            { label: 'Go to Hub', route: '/hub' },
            { label: 'Go to CEO Command', route: '/ceo' }
          ]
        },
        {
          title: 'Capture the event at the source',
          body: 'Use Hub quick actions for time-sensitive events. Record the animal, date, status and supporting details while the information is fresh; the record then becomes available in its related workspace.',
          bullets: [
            'Birth, death, sick and treatment entries update the livestock and health trail.',
            'Purchase requests move into procurement for review and approval.'
          ]
        },
        {
          title: 'Return to the workspace to follow through',
          body: 'A quick entry is the beginning, not the end. Open the relevant module to check the status, add context, resolve follow-up work and keep the record complete.',
          links: [
            { label: 'Review livestock', route: '/livestock' },
            { label: 'Review health', route: '/health' },
            { label: 'Review tasks', route: '/tasks' }
          ]
        }
      ],
      tips: [
        'When in doubt, begin in Hub and use the workspace cards to find the right record area.',
        'Use consistent animal IDs, dates and statuses so dashboards and reports remain trustworthy.'
      ]
    },
    {
      id: 'navigation',
      eyebrow: 'Orientation',
      title: 'Move around the application quickly',
      summary: 'Learn what the sidebar, top bar, profile menu and footer controls do.',
      icon: 'navigation',
      audience: 'Everyone',
      steps: [
        {
          title: 'Use the sidebar groups',
          body: 'The sidebar organizes the app into Dashboard, Operations, Supply Chain, Human Resources, Finance & Accounting, Commercial and Governance. Select a group to reveal its pages.',
          bullets: [
            'The hamburger button collapses the sidebar when you need more room.',
            'In collapsed mode, hover a group icon to reveal its page shortcuts.',
            'The highlighted item shows the route currently open.'
          ]
        },
        {
          title: 'Use the top bar for context and preferences',
          body: 'The top bar contains the sidebar toggle, search field, dark-mode toggle, notifications and your profile menu. Ctrl+K or Cmd+K focuses the search field from the keyboard.',
          bullets: [
            'The notification bell surfaces operational items that need attention.',
            'Dark mode is saved as a browser preference for your next visit.',
            'The profile menu provides Profile, Settings, Help & Support and Sign Out.'
          ]
        },
        {
          title: 'Use the footer shortcuts',
          body: 'The footer of the sidebar keeps Settings, Help and Sign Out available even when the navigation is collapsed. The question-mark icon opens this guide.',
          links: [
            { label: 'Open System Settings', route: '/settings' },
            { label: 'Open Help & Guides', route: '/help' }
          ]
        }
      ],
      tips: [
        'If a page appears missing, check whether its navigation group is collapsed before assuming you do not have access.',
        'Use browser Back and Forward normally; the app keeps route state in the URL.'
      ]
    },
    {
      id: 'hub-workflow',
      eyebrow: 'Daily rhythm',
      title: 'Run the daily operation from Hub',
      summary: 'Use the Hub as the launchpad for fast capture, hand-offs and a clean daily close.',
      icon: 'hub',
      audience: 'Farm, operations and supervisors',
      route: '/hub',
      routeLabel: 'Open Hub',
      steps: [
        {
          title: 'Start with Quick Actions',
          body: 'Quick Actions are designed for events that should not wait for a full register workflow. Choose the action, enter the minimum required details, and submit it to the correct API workflow.',
          bullets: [
            'Birth: create the new arrival and capture mother, species, sex and weight where available.',
            'Death: record the animal, date and cause so herd totals and mortality reporting stay accurate.',
            'Sick or Treatment: open the clinical trail and record severity, medicine and dosage.',
            'Purchase: send an item, quantity, estimate, priority and justification into procurement.'
          ]
        },
        {
          title: 'Use workspace cards for deeper work',
          body: 'When a record needs filtering, editing, a detail view or a related action, move from the quick action into the full workspace. Each workspace is grouped by the team that owns the next step.',
          links: [
            { label: 'Farm operations', route: '/livestock' },
            { label: 'Supply and facilities', route: '/inventory' },
            { label: 'People and tasks', route: '/hr' },
            { label: 'Business and oversight', route: '/ceo' }
          ]
        },
        {
          title: 'Close the loop before the end of the day',
          body: 'Review new records, open tasks, low stock and alerts before handing work to the next shift. Escalate issues in the relevant register rather than leaving context only in a message or memory.',
          links: [
            { label: 'Review CEO signals', route: '/ceo' },
            { label: 'Review open tasks', route: '/tasks' },
            { label: 'Review alerts and risks', route: '/risks' }
          ]
        }
      ],
      tips: [
        'Record first, enrich second: a timely minimum record is safer than a perfect record written days later.',
        'Use the same spelling and units across shifts to make filters and reports useful.'
      ]
    },
    {
      id: 'livestock-health-breeding',
      eyebrow: 'Operations',
      title: 'Manage livestock, health and breeding records',
      summary: 'Keep the herd register, clinical history and reproduction pipeline connected.',
      icon: 'livestock',
      audience: 'Farm, veterinary and livestock teams',
      steps: [
        {
          title: 'Treat the livestock register as the source of truth',
          body: 'Use Livestock to find animals by identifier, species, sex, location and status. Open a record when you need the full history; use filters before editing to avoid working on the wrong animal.',
          bullets: [
            'Confirm the animal ID and current location before recording an event.',
            'Keep lifecycle and health status current when an animal moves, is treated or leaves the herd.',
            'Use the detail view to inspect related events instead of creating a duplicate animal.'
          ],
          links: [{ label: 'Open Livestock', route: '/livestock' }]
        },
        {
          title: 'Track health from case to treatment',
          body: 'Health shows open and closed cases; Treatments shows active and completed care. Start with a case when a condition is observed, then add treatment detail and close the case only when the follow-up is complete.',
          bullets: [
            'Use severity to signal urgency and status to show whether work remains.',
            'Include medicine, dosage, start date and notes when those fields are available.',
            'Review ageing open cases regularly so no animal disappears from follow-up.'
          ],
          links: [
            { label: 'Open Health', route: '/health' },
            { label: 'Open Treatments', route: '/treatments' }
          ]
        },
        {
          title: 'Use Breeding for the forward plan',
          body: 'Breeding brings cycles, pregnancies, births and forecast information into one view. Use the tabs and filters to move between active pregnancies, recent births and breeding cycles awaiting an outcome.',
          bullets: [
            'Check expected birth dates and overdue pregnancies during the daily review.',
            'Use the breeding date, method and male or female identifiers to preserve traceability.',
            'Close or update outcomes when a pregnancy or cycle is resolved.'
          ],
          links: [{ label: 'Open Breeding', route: '/breeding' }]
        }
      ],
      tips: [
        'A clear animal ID is more valuable than a long note. Always verify the ID before saving.',
        'Use open, active and completed statuses consistently; dashboards depend on them.'
      ]
    },
    {
      id: 'supply-chain',
      eyebrow: 'Supply chain',
      title: 'Keep feed, stock, purchasing and maintenance moving',
      summary: 'Know what is on hand, what is needed, who supplies it and what equipment needs attention.',
      icon: 'supply',
      audience: 'Operations, procurement and facilities teams',
      steps: [
        {
          title: 'Check feed and inventory before placing a request',
          body: 'Feed provides the operational view of feed stock, consumption and days remaining. Inventory covers wider items and medicines. Check current stock, units and low-stock indicators before requesting more.',
          links: [
            { label: 'Open Feed', route: '/feed' },
            { label: 'Open Inventory', route: '/inventory' }
          ]
        },
        {
          title: 'Raise and follow a procurement request',
          body: 'Submit a purchase request with a clear item name, quantity, estimated cost, priority and justification. Procurement is where requests, approvals, purchases and suppliers can be reviewed together.',
          bullets: [
            'Use the justification to explain operational impact, not just repeat the item name.',
            'Check approval status before assuming an order has been placed.',
            'Keep supplier and goods-receipt information aligned with the request.'
          ],
          links: [
            { label: 'Open Procurement', route: '/procurement' },
            { label: 'Open Suppliers', route: '/suppliers' }
          ]
        },
        {
          title: 'Report assets and maintenance work',
          body: 'Use Assets for the equipment and facilities register. Use Maintenance for due work and tickets. Record the issue, priority, owner and resolution so recurring failures can be seen over time.',
          links: [
            { label: 'Open Assets', route: '/assets' },
            { label: 'Open Maintenance', route: '/maintenance' }
          ]
        }
      ],
      tips: [
        'Use one unit of measure per item wherever possible; mixing bags, kilograms and loose units makes stock harder to reconcile.',
        'A low-stock warning is a prompt to investigate, not proof that a purchase has been approved.'
      ]
    },
    {
      id: 'finance-commercial',
      eyebrow: 'Business',
      title: 'Record money, customers and commercial activity',
      summary: 'Keep operational spending, payables, sales and customer relationships visible to the right teams.',
      icon: 'finance',
      audience: 'Finance, commercial and leadership teams',
      steps: [
        {
          title: 'Use the Finance area by lifecycle',
          body: 'Finance Overview gives the headline view. Expenses capture operating costs, Invoices & Payables tracks bills and due dates, Payments records settlement, and Reports packages information for review.',
          bullets: [
            'Use the correct date and category so period totals reconcile.',
            'Keep supplier, invoice and payment references consistent across records.',
            'Use reports for a period view rather than manually adding numbers from multiple screens.'
          ],
          links: [
            { label: 'Finance Overview', route: '/finance' },
            { label: 'Expenses', route: '/expenses' },
            { label: 'Invoices & Payables', route: '/invoices' },
            { label: 'Finance Reports', route: '/finance/reports' }
          ]
        },
        {
          title: 'Build the commercial picture',
          body: 'Commercial pages organize companies, contacts, deals, livestock sales and marketing work. Keep the account, decision maker, stage, value and next action current so the pipeline reflects reality.',
          links: [
            { label: 'Companies and CRM', route: '/crm' },
            { label: 'Contacts', route: '/contacts' },
            { label: 'Deals', route: '/deals' },
            { label: 'Sales and Culls', route: '/sales' }
          ]
        },
        {
          title: 'Use marketing pages for the content-to-performance trail',
          body: 'Campaigns and Content Calendar hold the work being planned or produced. Channel Performance records the results. Connect the campaign, channel and reporting period whenever the fields are available.',
          links: [
            { label: 'Campaigns', route: '/campaigns' },
            { label: 'Content Calendar', route: '/marketing' },
            { label: 'Channel Performance', route: '/marketing/performance' }
          ]
        }
      ],
      tips: [
        'Financial records should be traceable to a document, supplier, request or approval wherever possible.',
        'Do not use a deal or expense note as a substitute for a formal invoice, payment or procurement record.'
      ]
    },
    {
      id: 'people-governance',
      eyebrow: 'People & control',
      title: 'Coordinate people, tasks and decisions',
      summary: 'Make ownership visible and keep operational risk from getting lost between teams.',
      icon: 'governance',
      audience: 'Managers, HR, owners and team leads',
      steps: [
        {
          title: 'Use People and Tasks for ownership',
          body: 'People contains employee records and attendance views. Tasks keeps incomplete work visible. Assign or describe the next action clearly so a hand-off does not depend on a private conversation.',
          links: [
            { label: 'Open People', route: '/hr' },
            { label: 'Open Tasks', route: '/tasks' }
          ]
        },
        {
          title: 'Use Governance for decisions and risk',
          body: 'Risks is the register for issues that could affect safety, animals, supply, finance or reputation. Decisions shows items waiting for owner or executive action. Add a concise consequence, owner and next review point.',
          links: [
            { label: 'Open Risks', route: '/risks' },
            { label: 'Open Decisions', route: '/decisions' },
            { label: 'Open SOPs', route: '/sops' }
          ]
        },
        {
          title: 'Use SOPs as the shared operating memory',
          body: 'SOPs should explain the approved way to perform repeatable work. Link the procedure to the task or incident context when possible and update the SOP rather than allowing multiple unofficial versions to circulate.'
        }
      ],
      tips: [
        'Every open task should have a useful verb, owner or team, due date and enough context to start.',
        'Escalate a risk early; a risk register is most useful before the issue becomes an incident.'
      ]
    },
    {
      id: 'dashboards-reporting',
      eyebrow: 'Insight',
      title: 'Read dashboards and turn them into action',
      summary: 'Use CEO Command and finance reports as decision tools, not just as displays of numbers.',
      icon: 'reporting',
      audience: 'Leadership, managers and analysts',
      route: '/ceo',
      routeLabel: 'Open CEO Command',
      steps: [
        {
          title: 'Start with attention items',
          body: 'CEO Command brings the most important signals together: herd, health, stock, operations, finance, growth and governance. Read alerts and action-level metrics first, then inspect the supporting module.',
          bullets: [
            'A metric with an action or watch state needs investigation, not automatic correction.',
            'Use the metric route to move from a headline number to the underlying records.',
            'Pay attention to the generated date and reporting range before comparing values.'
          ],
          links: [{ label: 'Open CEO Command', route: '/ceo' }]
        },
        {
          title: 'Understand unknown values',
          body: 'A dash or unknown value means the underlying data is missing or not reliable enough to display. Treat it as a data-quality task: find the source record, complete it and refresh the view.',
          links: [
            { label: 'Review livestock data', route: '/livestock' },
            { label: 'Review health data', route: '/health' },
            { label: 'Review feed data', route: '/feed' }
          ]
        },
        {
          title: 'Use reports for the conversation after the dashboard',
          body: 'Finance Reports and module tables provide the detail behind the leadership discussion. Capture the decision, owner and follow-up task rather than leaving a dashboard review without an action record.',
          links: [
            { label: 'Open Finance Reports', route: '/finance/reports' },
            { label: 'Open Decisions', route: '/decisions' }
          ]
        }
      ],
      tips: [
        'Ask “what changed, why, and who acts next?” for every metric that needs attention.',
        'Do not compare periods with different date ranges or incomplete source data.'
      ]
    },
    {
      id: 'settings-security',
      eyebrow: 'Administration',
      title: 'Configure the system and protect your session',
      summary: 'Use Settings for approved configuration changes and understand how sign-in security works.',
      icon: 'settings',
      audience: 'Owners, administrators and authorized managers',
      route: '/settings',
      routeLabel: 'Open Settings',
      steps: [
        {
          title: 'Change settings by category',
          body: 'Settings is organized into Organization & Info, Email & SMTP, Alert Triggers, Livestock Rules, Integrations and Security & Diagnostics. Work in one tab at a time and save changes with the Save Settings button.',
          bullets: [
            'General settings define company identity, contact channels, timezone and operating information.',
            'Alert and livestock rules affect the thresholds teams use to interpret operations.',
            'Integration settings describe connected services; test an integration after changing its details.'
          ],
          links: [{ label: 'Open System Settings', route: '/settings' }]
        },
        {
          title: 'Expect automatic logout after inactivity',
          body: 'For security, an authenticated user is signed out after 10 minutes without mouse, keyboard, touch, scroll or focus activity. The last activity is retained for the active browser session, so an abandoned tab cannot be revived simply by reloading it.',
          bullets: [
            'Save important work before stepping away from the app.',
            'If you are working in multiple tabs, activity and logout state are shared between them.',
            'Use Sign Out from the profile menu or sidebar footer when you finish.'
          ]
        },
        {
          title: 'Use diagnostics carefully',
          body: 'Test email, integration checks, cache clearing and configuration export are administrative operations. Only run them when authorized, and do not put passwords, tokens or secrets into notes or exported files.'
        }
      ],
      tips: [
        'Make one related settings change at a time and verify the result before changing another area.',
        'When troubleshooting an integration, record the time, service and error message rather than sharing credentials.'
      ]
    },
    {
      id: 'data-quality',
      eyebrow: 'Good practice',
      title: 'Keep records clean and useful',
      summary: 'A few habits make every filter, alert, dashboard and hand-off more reliable.',
      icon: 'quality',
      audience: 'Everyone who creates or updates records',
      steps: [
        {
          title: 'Identify before you edit',
          body: 'Check the animal, supplier, employee, company or document identifier before changing a record. Search and filter first; do not create a second record because the first one was difficult to find.'
        },
        {
          title: 'Complete the fields that drive decisions',
          body: 'Dates, statuses, locations, owners, quantities, severity, cost and next actions are more valuable than unstructured notes. If a value is unknown, leave it clearly unknown and follow up rather than inventing a value.',
          bullets: [
            'Use dates that reflect when the event occurred, not only when it was entered.',
            'Use status to show workflow state and notes to explain context.',
            'Use a consistent unit for quantity and cost within the relevant register.'
          ]
        },
        {
          title: 'Review after saving',
          body: 'After a create or update, confirm that the record appears with the expected status and related values. Refresh or revisit the workspace if you are checking a dashboard or a list that was already open.'
        }
      ],
      tips: [
        'If a dashboard number looks wrong, trace it back to source records before adjusting a threshold.',
        'Use the app’s formal record and task fields for decisions; keep chat and memory as supporting context only.'
      ]
    },
    {
      id: 'troubleshooting',
      eyebrow: 'When something feels stuck',
      title: 'Troubleshoot common problems',
      summary: 'A short checklist for empty pages, stale data, sign-in issues and failed saves.',
      icon: 'quality',
      audience: 'Everyone',
      steps: [
        {
          title: 'The page is loading or empty',
          body: 'Check your connection, wait for the loading state to finish, then refresh the page. Confirm that you are signed in and that the active filter or date range is not hiding the records you expect.',
          bullets: [
            'Clear search text and reset filters where the page provides a reset control.',
            'Try the page again from the sidebar instead of relying on a stale browser tab.',
            'If the problem affects several pages, note the time and workspace for an administrator.'
          ]
        },
        {
          title: 'A save or action failed',
          body: 'Read the validation message, complete required fields and submit again once. Do not repeatedly click a write action if you are unsure whether it succeeded; check the list or detail view first to avoid duplicates.'
        },
        {
          title: 'You were sent back to Login',
          body: 'The session may have expired after 10 minutes of inactivity or the token may have been invalidated. Sign in again, confirm the record you were working on, and save unfinished work as soon as possible.',
          links: [{ label: 'Return to Login', route: '/login' }]
        },
        {
          title: 'Escalate with useful context',
          body: 'When contacting your administrator, include the page, action, record identifier, approximate time, browser and exact error text. Never include your password, access token or SMTP secret.'
        }
      ],
      tips: [
        'Take a screenshot only after checking that it does not expose private financial, employee or credential information.',
        'If one record is wrong, correct the source record; do not work around it by creating a second copy.'
      ]
    }
  ];

  readonly faqs: HelpFaq[] = [
    {
      id: 'session',
      question: 'How long can I leave Evolex open?',
      answer: 'The app signs you out after 10 minutes without user activity. Activity in another open Evolex tab keeps the browser session coordinated, and signing out in one tab signs out the others.'
    },
    {
      id: 'where-start',
      question: 'Where should I start each day?',
      answer: 'Open Hub for quick entries and daily shortcuts, then review CEO Command for alerts, KPI changes and items that need a decision.',
      links: [
        { label: 'Open Hub', route: '/hub' },
        { label: 'Open CEO Command', route: '/ceo' }
      ]
    },
    {
      id: 'unknown',
      question: 'What does a dash or unknown metric mean?',
      answer: 'It means the source data is missing or not reliable enough to calculate the metric. Find the relevant source record, complete the key fields and refresh the dashboard rather than treating the dash as zero.'
    },
    {
      id: 'duplicate',
      question: 'What should I do if I think I created a duplicate?',
      answer: 'Stop creating new records, search by the identifier and date, and ask an authorized manager or administrator to confirm which record should remain. Do not delete or overwrite a record just because it is hard to find.'
    },
    {
      id: 'settings',
      question: 'Who should change Settings?',
      answer: 'Only users authorized to manage company, alert, integration or security configuration should change Settings. If you only need operational data updated, use the relevant workspace instead.'
    }
  ];

  get filteredGuides(): HelpGuide[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.guides;
    }

    return this.guides.filter((guide) => {
      const searchable = [
        guide.eyebrow,
        guide.title,
        guide.summary,
        guide.audience,
        ...guide.tips,
        ...guide.steps.flatMap((step) => [step.title, step.body, ...(step.bullets ?? [])])
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }

  get searchResultLabel(): string {
    const count = this.filteredGuides.length;
    return `${count} ${count === 1 ? 'guide' : 'guides'} found`;
  }

  activateGuide(id: string): void {
    this.activeGuideId = id;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  toggleFaq(id: string): void {
    this.expandedFaqId = this.expandedFaqId === id ? '' : id;
  }

  printGuide(): void {
    window.print();
  }
}
