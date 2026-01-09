import { Outlet } from 'react-router-dom';
import SettingsSidebar from './SettingsSidebar';

export default function SettingsLayout() {
    return (
        <div className="flex w-full h-full bg-muted/30">
            <SettingsSidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
