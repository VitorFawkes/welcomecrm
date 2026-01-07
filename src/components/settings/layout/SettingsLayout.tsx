import { Outlet } from 'react-router-dom';
import SettingsSidebar from './SettingsSidebar';

export default function SettingsLayout() {
    return (
        <div className="flex h-full bg-gray-50/50">
            <SettingsSidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
