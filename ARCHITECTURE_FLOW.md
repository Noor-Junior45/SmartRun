# ARCHITECTURE_FLOW.md (Visual System State)

```mermaid
graph TD
    Client[Web Browser / Capacitor Android App] -->|HTTPS Requests| CloudRun[Google Cloud Run Server :8080]
    Client -->|Auth / Session Storage| SupabaseAuth[Supabase Auth & Database]
    Client -->|Realtime Backup / User Profiles| Firestore[Firebase Cloud Firestore]

    subgraph Server_APIs [Cloud Run Server Routes]
        CloudRun --> AuthLogout[/api/auth/logout - Server Cookie Clearance/]
        CloudRun --> ResolveUser[/api/auth/resolve-phone-user/]
        CloudRun --> EmailRoutes[/api/send-email & /api/auth/send-welcome-email/]
        CloudRun --> SecurityRoutes[/api/auth/login-notification/]
    end

    subgraph Email_Dispatch_Gateways [Dedicated Resend Senders]
        EmailRoutes -->|Onboarding Welcome| WelcomeSender[welcome@smartrun.in]
        EmailRoutes -->|Order Status & PDF Invoice| OrderSender[order@smartrun.in]
        SecurityRoutes -->|Device & Security Alert| AlertSender[alert@smartrun.in]
    end

    subgraph Client_SignOut_Purge [Instant Logout Flow (<500ms)]
        Client --> ClearState[flushSync: UserProfile=null, Auth=false]
        Client --> NavigateLogin[navigate to /login]
        Client --> PurgeStorage[Clear localStorage, sessionStorage, caches, IndexedDB, cookies, Preferences]
    end
```
