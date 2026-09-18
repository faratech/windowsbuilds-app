<?php

namespace WindowsBuilds\Cron;

use WindowsBuilds\Service\Sitemap;

class GenerateSitemap
{
    /**
     * Generate sitemap for Windows and Edge builds
     * Called by XenForo cron system
     */
    public static function generate()
    {
        $app = \XF::app();
        
        /** @var Sitemap $sitemapService */
        $sitemapService = $app->service('WindowsBuilds:Sitemap');
        
        // Generate and save the sitemap
        $success = $sitemapService->saveSitemapToFile();

        if (!$success) {
            \XF::logError('Failed to generate Windows Builds sitemap');
        }

        return $success;
    }
}