import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { VoicePage } from './pages/VoicePage';
import { ChatPage } from './pages/ChatPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<VoicePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
