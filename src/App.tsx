/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sprout } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomesteadProvider, useHomestead } from './context/HomesteadContext';
import { AuthScreen } from './components/AuthScreen';
import { AppShell } from './components/AppShell';
import { DashboardView } from './modules/DashboardView';
import { WeatherView } from './modules/WeatherView';
import { PropertyView } from './modules/PropertyView';
import { CultivationView } from './modules/CultivationView';
import { AnimalsView } from './modules/AnimalsView';
import { PantryView } from './modules/PantryView';
import { CalendarView } from './modules/CalendarView';
import { ResourcesView } from './modules/ResourcesView';
import { ProjectsView } from './modules/ProjectsView';
import { KnowledgeView } from './modules/KnowledgeView';
import { NatureView } from './modules/NatureView';
import { ManagementView } from './modules/ManagementView';

const HomesteadRouter: React.FC = () => {
  const { authReady, firebaseUser, userProfile, profileLoading, activeModule } = useHomestead();

  if (!authReady || (firebaseUser && firebaseUser.emailVerified && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] dark:bg-[#0F1412]">
        <div className="flex flex-col items-center gap-3 text-neutral-700 dark:text-neutral-300">
          <div className="w-11 h-11 rounded-2xl bg-[#233A29] flex items-center justify-center animate-pulse">
            <Sprout className="w-6 h-6 text-[#BBE774]" />
          </div>
          <span className="text-sm font-medium">Hof & Garten wird geladen…</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified || !userProfile) {
    return <AuthScreen />;
  }

  return (
    <AppShell>
      {activeModule === 'dashboard' && <DashboardView />}
      {activeModule === 'weather' && <WeatherView />}
      {activeModule === 'property' && <PropertyView />}
      {activeModule === 'cultivation' && <CultivationView />}
      {activeModule === 'animals' && <AnimalsView />}
      {activeModule === 'pantry' && <PantryView />}
      {activeModule === 'calendar' && <CalendarView />}
      {activeModule === 'resources' && <ResourcesView />}
      {activeModule === 'projects' && <ProjectsView />}
      {activeModule === 'knowledge' && <KnowledgeView />}
      {activeModule === 'nature' && <NatureView />}
      {activeModule === 'management' && <ManagementView />}
    </AppShell>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <HomesteadProvider>
        <HomesteadRouter />
      </HomesteadProvider>
    </ErrorBoundary>
  );
}
