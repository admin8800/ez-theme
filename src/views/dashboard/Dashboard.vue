<template>
  <div class="dashboard-container">
    <div class="dashboard-inner">
      <section class="dashboard-hero card-animate">
        <div class="hero-main-panel">
          <div class="hero-kicker">
            <span
                class="hero-status-dot"
                :class="{
                  inactive: !hasPlan,
                  danger: hasPlan && (isExpired || isTrafficDepleted),
                  warning: hasPlan && (isExpiringSoon || isLowTraffic)
                }"
            ></span>
            <span>{{ hasPlan ? $t('dashboard.subscriptionInfo') : $t('dashboard.welcome') }}</span>
          </div>
          <div class="hero-title-row">
            <div>
              <h1 class="hero-title">{{ hasPlan ? (userPlan.name || $t('dashboard.noSubscription')) : $t('dashboard.noPlanPrompt') }}</h1>
              <p class="hero-subtitle">{{ $t('dashboard.welcomeDesc') }}</p>
            </div>
            <div v-if="userStats.userEmail && DASHBOARD_CONFIG.showUserEmail" class="hero-user">
              <IconMail :size="16"/>
              <span>{{ userStats.userEmail }}</span>
            </div>
          </div>

          <div v-if="hasPlan" class="hero-progress">
            <div class="hero-progress-head">
              <span>{{ $t('dashboard.remainingTraffic') }}</span>
              <strong>{{ trafficPercentage }}%</strong>
            </div>
            <div class="hero-progress-track">
              <div
                  class="hero-progress-bar"
                  :class="{ warning: isLowTraffic && !isTrafficDepleted, danger: isTrafficDepleted }"
                  :style="{ width: waterAnimationState.canAnimate ? `${trafficPercentage}%` : '0%' }"
              ></div>
            </div>
          </div>

          <div v-if="hasPlan" class="hero-metrics">
            <div class="hero-metric">
              <span>{{ $t('dashboard.remainingTraffic') }}</span>
              <strong>{{ userStats.remainingTraffic }}</strong>
            </div>
            <div class="hero-metric">
              <span>{{ $t('dashboard.remainingDays') }}</span>
              <strong>
                {{
                  userStats.isRemainingDaysPermanent ? $t('dashboard.permanent') : userStats.remainingDays + $t('dashboard.days')
                }}
              </strong>
            </div>
            <div class="hero-metric">
              <span>{{ $t('dashboard.accountBalance') }}</span>
              <strong>{{ userStats.accountBalance }}</strong>
            </div>
            <div class="hero-metric" v-if="showDeviceLimit">
              <span>{{ $t('dashboard.deviceLimit') }}</span>
              <strong>
                {{
                  userPlan.deviceLimit === null ? `${userPlan.aliveIp} / ${$t('dashboard.unlimited')}` : `${userPlan.aliveIp} / ${userPlan.deviceLimit}`
                }}
              </strong>
            </div>
          </div>

          <div class="hero-actions">
            <button v-if="!hasPlan" class="hero-btn primary" @click="goToShop">
              <IconShoppingBag :size="18"/>
              <span>{{ $t('dashboard.purchasePlan') }}</span>
            </button>
            <button v-if="hasPlan && showImportSubscription" class="hero-btn primary" @click="toggleImportCard">
              <IconShare :size="18"/>
              <span>{{ $t('dashboard.importSubscription') }}</span>
            </button>
            <button v-if="hasPlan && showRenewPlanButton" class="hero-btn secondary" @click="renewPlan">
              <IconShoppingCart :size="18"/>
              <span>{{ $t('dashboard.renewPlan') }}</span>
            </button>
            <button v-if="hasPlan && showResetTrafficButton" class="hero-btn secondary" @click="openResetTrafficModal">
              <IconRefresh :size="18"/>
              <span>{{ $t('dashboard.resetTraffic') }}</span>
            </button>
            <button v-if="hasPlan && allowNewPeriod==='1'&&showResetTrafficButton" class="hero-btn secondary" @click="showPopup=true">
              <IconCalendarPlus :size="18"/>
              <span>{{ $t('dashboard.activateDataCycleInAdvance') }}</span>
            </button>
            <button class="hero-btn ghost" @click="goToSupport">
              <IconMessage :size="18"/>
              <span>{{ $t('dashboard.ticketSupport') }}</span>
            </button>
          </div>
        </div>

        <aside class="hero-side-panel">
          <button v-if="hasPendingItems" class="hero-alert-row" @click="userStats.pendingOrders > 0 ? router.push('/orders') : goToSupport()">
            <span class="hero-alert-icon">
              <IconShoppingCart v-if="userStats.pendingOrders > 0" :size="18"/>
              <IconMessage v-else :size="18"/>
            </span>
            <span>
              {{
                userStats.pendingOrders > 0
                    ? `${$t('dashboard.pendingOrders')} (${userStats.pendingOrders})`
                    : `${$t('dashboard.pendingTickets')} (${userStats.pendingTickets})`
              }}
            </span>
            <IconChevronRight :size="16"/>
          </button>

          <div v-if="notices && notices.data && notices.data.length > 0" class="hero-notice">
            <div class="hero-notice-head">
              <span>{{ $t('dashboard.siteAnnouncement') }}</span>
              <small>{{ currentNoticeIndex + 1 }} / {{ notices.data.length }}</small>
            </div>
            <transition name="fade-slide" mode="out-in">
              <button class="hero-notice-card" v-if="notices.data[currentNoticeIndex]" :key="currentNoticeIndex" @click="showNoticeModal">
                <span>{{ notices.data[currentNoticeIndex].title }}</span>
                <small>{{ formatDate(notices.data[currentNoticeIndex].created_at) }}</small>
              </button>
            </transition>
            <div class="hero-notice-nav">
              <button @click="prevNotice" :disabled="currentNoticeIndex <= 0">
                <IconChevronLeft :size="15"/>
              </button>
              <button @click="showNoticeModal">
                <IconEye :size="15"/>
              </button>
              <button @click="nextNotice" :disabled="currentNoticeIndex >= notices.data.length - 1">
                <IconChevronRight :size="15"/>
              </button>
            </div>
          </div>

          <button class="hero-quick-link" @click="openDocumentation">
            <span>
              <IconFileText :size="18"/>
              {{ $t('dashboard.documentation') }}
            </span>
            <IconChevronRight :size="16"/>
          </button>
        </aside>
      </section>
      <!-- 公告弹窗 -->
      <transition name="fade">
        <div v-if="showNoticeDetails" class="notice-modal-overlay" @click="closeNoticeModal">
          <transition name="popup-slide">
            <div v-if="showNoticeDetails" class="notice-modal" :style="noticeModalStyle" @click.stop>
              <div class="notice-modal-header">
                <h2 class="popup-title">{{ notices.data[currentNoticeIndex].title }}</h2>
                <button class="popup-close-btn" @click="closeNoticeModal">
                  <IconX :size="20"/>
                </button>
              </div>
              <div class="notice-modal-content">
                <div v-html="processedNoticeContent" class="notice-content"></div>
              </div>
              <div class="notice-modal-footer">
                <button class="popup-action-btn adaptive-btn" @click="closeNoticeModal">
                  {{ $t('common.close') }}
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>

      <!-- 订阅导入卡片 -->
      <transition name="slide-fade">
        <AppCard v-if="showImportCard && userPlan.subscribeUrl" class="dashboard-card import-card" hoverable no-padding>
          <div class="card-header">
            <h2 class="card-title">{{ $t('dashboard.importSubscription') }}</h2>
            <button class="close-btn" @click="showImportCard = false">
              <span class="close-icon"></span>
            </button>
          </div>
          <div class="card-body">
            <div class="import-action copy-action" @click="copySubscription">
              <div class="import-icon">
                <IconCopy :size="24"/>
              </div>
              <div class="import-content">
                <div class="import-title">{{ $t('dashboard.copySubscription') }}</div>
                <div class="import-desc">{{ $t('dashboard.copySubscriptionDesc') }}</div>
              </div>
            </div>

            <div class="import-action qrcode-action" @click="showQrCode = true">
              <div class="import-icon">
                <IconQrcode :size="24"/>
              </div>
              <div class="import-content">
                <div class="import-title">{{ $t('dashboard.scanQRCode') }}</div>
                <div class="import-desc">{{ $t('dashboard.scanQRCodeDesc') }}</div>
              </div>
            </div>

            <!-- 平台选择器 -->
            <div class="platform-selector">
              <button
                  v-for="platform in platforms"
                  :key="platform.id"
                  class="platform-button"
                  :class="{ 'active': activePlatform === platform.id }"
                  @click="activePlatform = platform.id"
              >
                <component :is="platform.icon" :size="16"/>
                <span>{{ $t(`platforms.${platform.id}`) }}</span>
              </button>
            </div>

            <!-- iOS平台选项 -->
            <div v-if="activePlatform === 'ios'" class="platform-section">
              <div class="platform-title">iOS</div>
              <div v-if="hasIOSClients" class="platform-options">
                <div v-if="clientConfig.showShadowrocket" class="platform-option"
                     @click="importToClient('shadowrocket')">
                  <img :src="shadowrocketIcon" class="client-icon" alt="Shadowrocket"/>
                  <span>Shadowrocket</span>
                </div>
                <div v-if="clientConfig.showSurge" class="platform-option" @click="importToClient('surge')">
                  <img :src="surgeIcon" class="client-icon" alt="Surge"/>
                  <span>Surge</span>
                </div>
                <div v-if="clientConfig.showStash" class="platform-option" @click="importToClient('stash')">
                  <img :src="stashIcon" class="client-icon" alt="Stash"/>
                  <span>Stash</span>
                </div>
                <div v-if="clientConfig.showQuantumultX" class="platform-option" @click="importToClient('quantumultx')">
                  <img :src="quantumultIcon" class="client-icon" alt="Quantumult X"/>
                  <span>Quantumult X</span>
                </div>
                <div v-if="clientConfig.showHiddifyIOS" class="platform-option" @click="importToClient('hiddify-ios')">
                  <img :src="hiddifyMacIcon" class="client-icon" alt="Hiddify"/>
                  <span>Hiddify</span>
                </div>
                <div v-if="clientConfig.showSingboxIOS" class="platform-option" @click="importToClient('singbox-ios')">
                  <img :src="singboxIcon" class="client-icon" alt="Singbox"/>
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showLoon" class="platform-option" @click="importToClient('loon')">
                  <img :src="loonIcon" class="client-icon" alt="Loon"/>
                  <span>Loon</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>

            <!-- Android平台选项 -->
            <div v-if="activePlatform === 'android'" class="platform-section">
              <div class="platform-title">Android</div>
              <div v-if="hasAndroidClients" class="platform-options">
                <div v-if="clientConfig.showFlClashAndroid" class="platform-option" @click="importToClient('flclash')">
                  <img :src="flclashIcon" class="client-icon" alt="FlClash"/>
                  <span>FlClash</span>
                </div>
                <div v-if="clientConfig.showV2rayNG" class="platform-option" @click="importToClient('v2rayng')">
                  <img :src="v2rayNGIcon" class="client-icon" alt="V2rayNG"/>
                  <span>V2rayNG</span>
                </div>
                <div v-if="clientConfig.showClashAndroid" class="platform-option"
                     @click="importToClient('clash-android')">
                  <img :src="clashAndroidIcon" class="client-icon" alt="Clash"/>
                  <span>Clash</span>
                </div>
                <div v-if="clientConfig.showSurfboard" class="platform-option" @click="importToClient('surfboard')">
                  <img :src="surfboardIcon" class="client-icon" alt="Surfboard"/>
                  <span>Surfboard</span>
                </div>
                <div v-if="clientConfig.showClashMetaAndroid" class="platform-option"
                     @click="importToClient('clash-meta-android')">
                  <img :src="clashMetaAndroidIcon" class="client-icon" alt="Clash Meta"/>
                  <span>Clash Meta</span>
                </div>
                <div v-if="clientConfig.showNekobox" class="platform-option" @click="importToClient('nekobox')">
                  <img :src="nekoboxIcon" class="client-icon" alt="Nekobox"/>
                  <span>Nekobox</span>
                </div>
                <div v-if="clientConfig.showSingboxAndroid" class="platform-option"
                     @click="importToClient('singbox-android')">
                  <img :src="singboxAndroidIcon" class="client-icon" alt="Singbox"/>
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showHiddifyAndroid" class="platform-option"
                     @click="importToClient('hiddify-android')">
                  <img :src="hiddifyAndroidIcon" class="client-icon" alt="Hiddify"/>
                  <span>Hiddify</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>

            <!-- Windows平台选项 -->
            <div v-if="activePlatform === 'windows'" class="platform-section">
              <div class="platform-title">Windows</div>
              <div v-if="hasWindowsClients" class="platform-options">
                <div v-if="clientConfig.showFlClashWindows" class="platform-option" @click="importToClient('flclash')">
                  <img :src="flclashIcon" class="client-icon" alt="FlClash"/>
                  <span>FlClash</span>
                </div>
                <div v-if="clientConfig.showClashVergeWindows" class="platform-option" @click="importToClient('clashverge')">
                  <img :src="clashvergeIcon" class="client-icon" alt="ClashVerge"/>
                  <span>ClashVerge</span>
                </div>
                <div v-if="clientConfig.showClashWindows" class="platform-option" @click="importToClient('clash')">
                  <img :src="clashWindowsIcon" class="client-icon" alt="Clash"/>
                  <span>Clash</span>
                </div>
                <div v-if="clientConfig.showNekoray" class="platform-option" @click="importToClient('nekoray')">
                  <img :src="nekorayIcon" class="client-icon" alt="Nekoray"/>
                  <span>Nekoray</span>
                </div>
                <div v-if="clientConfig.showSingboxWindows" class="platform-option"
                     @click="importToClient('singbox-windows')">
                  <img :src="singboxWindowsIcon" class="client-icon" alt="Singbox"/>
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showHiddifyWindows" class="platform-option"
                     @click="importToClient('hiddify-windows')">
                  <img :src="hiddifyWindowsIcon" class="client-icon" alt="Hiddify"/>
                  <span>Hiddify</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>

            <!-- MacOS平台选项 -->
            <div v-if="activePlatform === 'macos'" class="platform-section">
              <div class="platform-title">MacOS</div>
              <div v-if="hasMacOSClients" class="platform-options">
                <div v-if="clientConfig.showFlClashMac" class="platform-option" @click="importToClient('flclash')">
                  <img :src="flclashIcon" class="client-icon" alt="FlClash"/>
                  <span>FlClash</span>
                </div>
                <div v-if="clientConfig.showClashVergeMac" class="platform-option" @click="importToClient('clashverge')">
                  <img :src="clashvergeIcon" class="client-icon" alt="ClashVerge"/>
                  <span>ClashVerge</span>
                </div>
                <div v-if="clientConfig.showClashX" class="platform-option" @click="importToClient('clashx')">
                  <img :src="clashXIcon" class="client-icon" alt="ClashX"/>
                  <span>ClashX</span>
                </div>
                <div v-if="clientConfig.showClashMetaX" class="platform-option" @click="importToClient('clashx-meta')">
                  <img :src="clashMetaXIcon" class="client-icon" alt="ClashX Meta"/>
                  <span>ClashX Meta</span>
                </div>
                <div v-if="clientConfig.showSurgeMac" class="platform-option" @click="importToClient('surge-mac')">
                  <img :src="surgeMacIcon" class="client-icon" alt="Surge"/>
                  <span>Surge</span>
                </div>
                <div v-if="clientConfig.showStashMac" class="platform-option" @click="importToClient('stash-mac')">
                  <img :src="stashMacIcon" class="client-icon" alt="Stash"/>
                  <span>Stash</span>
                </div>
                <div v-if="clientConfig.showQuantumultXMac" class="platform-option"
                     @click="importToClient('quantumultx-mac')">
                  <img :src="quantumultXMacIcon" class="client-icon" alt="Quantumult X"/>
                  <span>Quantumult X</span>
                </div>
                <div v-if="clientConfig.showSingboxMac" class="platform-option"
                     @click="importToClient('singbox-macos')">
                  <img :src="singboxMacIcon" class="client-icon" alt="Singbox"/>
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showHiddifyMac" class="platform-option"
                     @click="importToClient('hiddify-macos')">
                  <img :src="hiddifyMacIcon" class="client-icon" alt="Hiddify"/>
                  <span>Hiddify</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>
          </div>
        </AppCard>
      </transition>

      <!-- QR码模态窗口 -->
      <transition name="fade">
        <div v-if="showQrCode" class="qrcode-modal-overlay" @click="showQrCode = false">
          <div class="qrcode-modal" @click.stop>
            <div class="qrcode-header">
              <h3>{{ $t('dashboard.scanQRCode') }}</h3>
              <button class="close-btn" @click="showQrCode = false">
                <span class="close-icon"></span>
              </button>
            </div>
            <div class="qrcode-content">
              <div v-if="qrCodeLoading" class="qrcode-loading">
                <div class="loading-spinner"></div>
                <p>{{ $t('common.loadingQRCode') }}</p>
              </div>
              <img v-else :src="qrCodeUrl" alt="QR Code" @load="qrCodeLoaded"/>
            </div>
          </div>
        </div>
      </transition>

      <!-- 官方客户端下载区域 -->
      <AppCard class="dashboard-card download-card" :class="{'card-animate': !loading.userInfo}"
           v-if="clientConfig.showDownloadCard" style="animation-delay: 0.9s" hoverable no-padding>
        <div class="card-header">
          <h2 class="card-title">{{ $t('dashboard.officialClients') }}</h2>
        </div>
        <div class="card-body">
          <div class="download-options">
            <div class="download-option" v-if="clientConfig.showIOS" @click="downloadClient('ios')">
              <div class="option-icon ios">
                <IconBrandApple :size="32"/>
              </div>
              <div class="option-name">iOS</div>
            </div>

            <div class="download-option" v-if="clientConfig.showAndroid" @click="downloadClient('android')">
              <div class="option-icon android">
                <IconBrandAndroid :size="32"/>
              </div>
              <div class="option-name">Android</div>
            </div>

            <div class="download-option" v-if="clientConfig.showMacOS" @click="downloadClient('macos')">
              <div class="option-icon macos">
                <IconBrandFinder :size="32"/>
              </div>
              <div class="option-name">MacOS</div>
            </div>

            <div class="download-option" v-if="clientConfig.showWindows" @click="downloadClient('windows')">
              <div class="option-icon windows">
                <IconBrandWindows :size="32"/>
              </div>
              <div class="option-name">Windows</div>
            </div>

            <div class="download-option" v-if="clientConfig.showLinux" @click="downloadClient('linux')">
              <div class="option-icon linux">
                <IconBrandDebian :size="32"/>
              </div>
              <div class="option-name">Linux</div>
            </div>

            <div class="download-option" v-if="clientConfig.showOpenWrt" @click="downloadClient('openwrt')">
              <div class="option-icon openwrt">
                <IconRouter :size="32"/>
              </div>
              <div class="option-name">OpenWrt</div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
    <!-- 弹窗组件 -->
    <CommonDialog
        :show-dialog="showPopup"
        :title="$t('invite.withdraw.tip')"
        :content="$t('dashboard.resetDataCycleNotice')"
        cancel-button-i18n-key="profile.cancel"
        confirm-button-i18n-key="profile.iKnow"
        @close="handlePopupClose"
        @confirm="handlePopupConfirm"
    />

  </div>

  <!-- 重置流量确认弹窗 -->
  <transition name="modal-fade">
    <div class="modal-overlay" v-if="showResetTrafficModal">
      <div class="modal-container">
        <div class="modal-card reset-traffic-modal">
          <div class="modal-header">
            <h3>{{ $t('dashboard.resetTrafficConfirm') }}</h3>
            <button class="close-button" @click="closeResetTrafficModal">×</button>
          </div>
          <div class="modal-body">
            <div class="warning-icon">
              <IconAlertTriangle :size="48"/>
            </div>
            <p class="warning-text">{{ $t('dashboard.resetTrafficDesc') }}</p>
            <p class="note-text">{{ $t('dashboard.resetTrafficWarning') }}</p>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeResetTrafficModal">
              {{ $t('common.cancel') }}
            </button>
            <button
                class="confirm-btn"
                :disabled="resetConfirmCooldown > 0 || isCreatingResetOrder"
                @click="createResetTrafficOrder"
            >
              <template v-if="isCreatingResetOrder">
                <span class="loading-container">
                  <div class="loader-small"></div>
                  <span>{{ $t('common.loading') }}</span>
                </span>
              </template>
              <template v-else>
                {{
                  resetConfirmCooldown > 0 ? `${$t('common.confirm')} (${resetConfirmCooldown})` : $t('common.confirm')
                }}
              </template>
            </button>
          </div>
        </div>
      </div>


    </div>
  </transition>

</template>

<script>
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch
} from 'vue';
import {useRouter} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {CLIENT_CONFIG, DASHBOARD_CONFIG, isXiaoV2board, SITE_CONFIG} from '@/utils/baseConfig';
import {
  IconAlertTriangle,
  IconBox,
  IconBrandAndroid,
  IconBrandApple,
  IconBrandDebian,
  IconBrandFinder,
  IconBrandGithub,
  IconBrandWindows,
  IconCalendar,
  IconCat,
  IconChevronLeft,
  IconChevronRight,
  IconCoins,
  IconCopy,
  IconCrosshair,
  IconDeviceDesktop,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconHelpCircle,
  IconMail,
  IconMessage,
  IconMoon,
  IconPackage,
  IconQrcode,
  IconRefresh,
  IconRocket,
  IconRouter,
  IconSend,
  IconShare,
  IconShoppingBag,
  IconShoppingCart,
  IconTransferVertical,
  IconUserPlus,
  IconWallet,
  IconWaveSawTool,
  IconWaveSine,
  IconX,
  IconCalendarPlus
} from '@tabler/icons-vue';
import CommonDialog from '@/components/popup/CommonDialog.vue';
import AppCard from '@/components/common/AppCard.vue';
import {getNotices, getSubscribe, getUserConfig, getUserInfo, getUserStats, setNextPeriod} from '@/api/dashboard';
import {useToast} from '@/composables/useToast';
import {submitOrder} from '@/api/shop';
import MarkdownIt from 'markdown-it';
import shadowrocketIconImg from '@/assets/images/client-img-ios/shadowrocket.png';
import surgeIconImg from '@/assets/images/client-img-ios/Surge.png';
import stashIconImg from '@/assets/images/client-img-ios/stash.png';
import quantumultIconImg from '@/assets/images/client-img-ios/quantumultx.png';
import singboxIconImg from '@/assets/images/client-img-ios/singbox.png';
import loonIconImg from '@/assets/images/client-img-ios/loon.png';
import v2rayNGIconImg from '@/assets/images/client-img-android/v2rayng.png';
import clashAndroidIconImg from '@/assets/images/client-img-android/clash.png';
import surfboardIconImg from '@/assets/images/client-img-android/surfboard.png';
import clashMetaAndroidIconImg from '@/assets/images/client-img-android/clashmeta.png';
import nekoboxIconImg from '@/assets/images/client-img-android/nekobox.png';
import singboxAndroidIconImg from '@/assets/images/client-img-android/singbox.png';
import hiddifyAndroidIconImg from '@/assets/images/client-img-android/hiddify.png';
import flclashIconImg from '@/assets/images/client-img-windows/flclash.png';
import clashvergeIconImg from '@/assets/images/client-img-windows/clashverge.png';
import clashWindowsIconImg from '@/assets/images/client-img-windows/clash.png';
import nekorayIconImg from '@/assets/images/client-img-windows/nekoray.png';
import singboxWindowsIconImg from '@/assets/images/client-img-windows/singbox.png';
import hiddifyWindowsIconImg from '@/assets/images/client-img-windows/hiddify.png';
import clashXIconImg from '@/assets/images/client-img-macos/clashx.png';
import clashMetaXIconImg from '@/assets/images/client-img-macos/clashmetax.png';
import surgeMacIconImg from '@/assets/images/client-img-macos/Surge.png';
import stashMacIconImg from '@/assets/images/client-img-macos/stash.png';
import quantumultXMacIconImg from '@/assets/images/client-img-macos/quantumultx.png';
import singboxMacIconImg from '@/assets/images/client-img-macos/singbox.png';
import hiddifyMacIconImg from '@/assets/images/client-img-macos/hiddify.png';

import {cleanupResources, createTimer} from '@/utils/componentLifecycle';
import {
  calculateTrafficPercentage,
  formatTrafficSize,
  isTrafficBelowThreshold,
  isTrafficEmpty
} from './composables/dashboardMetrics';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
});

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  let href = '';

  if (hrefIndex >= 0) {
    href = token.attrs[hrefIndex][1];
  }

  if (href.includes('#eztheme-btn') || href.includes('class=eztheme-btn') || href.includes('?eztheme-btn')) {
    token.attrs[hrefIndex][1] = href
        .replace('#eztheme-btn', '')
        .replace('class=eztheme-btn', '')
        .replace('?eztheme-btn', '');

    const classIndex = token.attrIndex('class');
    if (classIndex < 0) {
      token.attrPush(['class', 'eztheme-btn']);
    } else {
      const classes = token.attrs[classIndex][1];
      if (!classes.includes('eztheme-btn')) {
        token.attrs[classIndex][1] = classes + ' eztheme-btn';
      }
    }
  }

  return self.renderToken(tokens, idx, options);
};

export default {
  name: 'UserDashboard',
  components: {
    IconBox,
    IconSend,
    IconCalendar,
    IconUserPlus,
    IconShoppingCart,
    IconFileText,
    IconWallet,
    IconBrandApple,
    IconBrandAndroid,
    IconBrandWindows,
    IconBrandDebian,
    IconRouter,
    IconBrandFinder,
    IconChevronRight,
    IconTransferVertical,
    IconShare,
    IconMessage,
    IconMail,
    IconChevronLeft,
    IconCopy,
    IconQrcode,
    IconRocket,
    IconWaveSine,
    IconDeviceDesktop,
    IconCrosshair,
    IconPackage,
    IconMoon,
    IconWaveSawTool,
    IconBrandGithub,
    IconCat,
    IconEyeOff,
    IconShoppingBag,
    IconHelpCircle,
    IconCoins,
    IconEye,
    IconRefresh,
    IconAlertTriangle,
    IconX,
    IconCalendarPlus,
    AppCard,
    CommonDialog
  },
  setup() {
    const {t, locale} = useI18n();
    const router = useRouter();
    const clientConfig = reactive(CLIENT_CONFIG);
    const notices = ref([]);
    const autoRotateNotices = ref(true);
    const userPlan = ref({
      deviceLimit: null,
      aliveIp: 0,
      resetDay: null
    });
    const qrCodeLoading = ref(true);
    const showImportSubscription = ref(DASHBOARD_CONFIG.showImportSubscription)

    const languageChangedSignal = inject('languageChangedSignal', ref(0));

    const shadowrocketIcon = shadowrocketIconImg;
    const surgeIcon = surgeIconImg;
    const stashIcon = stashIconImg;
    const quantumultIcon = quantumultIconImg;
    const singboxIcon = singboxIconImg;
    const loonIcon = loonIconImg;

    const v2rayNGIcon = v2rayNGIconImg;
    const clashAndroidIcon = clashAndroidIconImg;
    const surfboardIcon = surfboardIconImg;
    const clashMetaAndroidIcon = clashMetaAndroidIconImg;
    const nekoboxIcon = nekoboxIconImg;
    const singboxAndroidIcon = singboxAndroidIconImg;
    const hiddifyAndroidIcon = hiddifyAndroidIconImg;

    const flclashIcon = flclashIconImg;
    const clashvergeIcon = clashvergeIconImg;
    const clashWindowsIcon = clashWindowsIconImg;
    const nekorayIcon = nekorayIconImg;
    const singboxWindowsIcon = singboxWindowsIconImg;
    const hiddifyWindowsIcon = hiddifyWindowsIconImg;

    const clashXIcon = clashXIconImg;
    const clashMetaXIcon = clashMetaXIconImg;
    const surgeMacIcon = surgeMacIconImg;
    const stashMacIcon = stashMacIconImg;
    const quantumultXMacIcon = quantumultXMacIconImg;
    const singboxMacIcon = singboxMacIconImg;
    const hiddifyMacIcon = hiddifyMacIconImg;

    const userStats = reactive({
      remainingTraffic: '',
      remainingDays: '',
      accountBalance: '0.00',
      pendingOrders: 0,
      pendingTickets: 0,
      userEmail: '',
      isRemainingDaysPermanent: false
    });
    const userBalance = ref('0.00');
    const currencySymbol = ref('$');
    const hasPlan = ref(true);
    const currentNoticeIndex = ref(0);
    const showNoticeDetails = ref(false);
    const showImportCard = ref(false);
    const showQrCode = ref(false);
    const {showToast} = useToast();
    const qrCodeUrl = ref('');

    //提前开启下月
    const allowNewPeriod = ref('')

    const platforms = [
      {id: 'ios', icon: 'IconBrandApple'},
      {id: 'android', icon: 'IconBrandAndroid'},
      {id: 'windows', icon: 'IconBrandWindows'},
      {id: 'macos', icon: 'IconBrandFinder'}
    ];

    const activePlatform = ref(detectUserPlatform());

    function detectUserPlatform() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;

      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return 'ios';
      }

      if (/android/i.test(userAgent)) {
        return 'android';
      }

      if (/Mac/.test(userAgent)) {
        return 'macos';
      }

      return 'windows';
    }

    const loading = reactive({
      userInfo: true,
      userStats: true,
      notices: true,
      userPlan: true,
      subscribe: true
    });

    const waterAnimationState = reactive({
      canAnimate: false,
      initialized: false
    });

    watch(() => [loading.userStats, loading.userInfo], ([userStatsLoading, userInfoLoading]) => {
      if (!userStatsLoading && !userInfoLoading) {
        setTimeout(() => {
          waterAnimationState.canAnimate = true;
          waterAnimationState.initialized = true;
        }, 500);
      }
    }, {immediate: false, flush: 'post'});

    watch(() => locale.value, () => {
      if (userPlan.value.isExpireDatePermanent) {
        userPlan.value.expireDate = t('dashboard.permanent');
      }
    });

    const openDocumentation = () => {
      router.push('/docs');
    };

    const downloadClient = (platform) => {
      const downloadUrl = clientConfig.clientLinks[platform];
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    };

    const goToShop = () => {
      router.push('/shop');
    };

    const userPlanId = ref(null);

    const showResetTrafficModal = ref(false);
    const resetConfirmCooldown = ref(0);
    const resetConfirmTimer = ref(null);
    const isCreatingResetOrder = ref(false);

    const openResetTrafficModal = () => {
      showResetTrafficModal.value = true;
      resetConfirmCooldown.value = 3;
      resetConfirmTimer.value = setInterval(() => {
        if (resetConfirmCooldown.value > 0) {
          resetConfirmCooldown.value--;
        } else {
          clearInterval(resetConfirmTimer.value);
        }
      }, 1000);
    };
    const showPopup = ref(false);
    const popupConfig = reactive({

      title: t('invite.withdraw.tip'),

      content: t('dashboard.resetDataCycleNotice'),

      cooldownHours: 0,

      closeWaitSeconds: 0

    });
    const handlePopupClose = () => {

      showPopup.value = false;
      // nextPeriod()

    };
    const handlePopupConfirm = async () => {
      try {
        const response = await setNextPeriod()
        if (response.data) {
          await fetchSubscribe()
          showToast(t('dashboard.nextPeriodSuccess'), 'success');
          showPopup.value = false;
        }
      } catch (error) {
        console.error('提前开启下月失败:', error);
        showToast(t('dashboard.nextPeriodError'), 'error');
      }

    }

    const closeResetTrafficModal = () => {
      showResetTrafficModal.value = false;
      if (resetConfirmTimer.value) {
        clearInterval(resetConfirmTimer.value);
      }
    };

    const createResetTrafficOrder = async () => {
      if (resetConfirmCooldown.value > 0) {
        return;
      }

      isCreatingResetOrder.value = true;

      try {
        if (!userPlanId.value) {
          showToast(t('common.error_occurred'), 'error');
          isCreatingResetOrder.value = false;
          return;
        }

        const response = await submitOrder({
          plan_id: userPlanId.value,
          period: 'reset_price'
        });

        if (response && response.data) {
          showToast(t('dashboard.resetTrafficSuccess'), 'success');

          closeResetTrafficModal();

          router.push({
            path: '/payment',
            query: {
              trade_no: response.data
            }
          });
        }
      } catch (error) {
        console.error('创建重置流量订单失败:', error);
        showToast(error.message || t('common.error_occurred'), 'error');
      } finally {
        isCreatingResetOrder.value = false;
      }
    };

    const fetchUserInfo = async () => {
      if (loading.userInfo === false && Object.keys(userPlan.value).length > 0) return;

      loading.userInfo = true;
      try {
        const response = await getUserInfo();
        if (response.data) {
          const info = response.data;

          userPlanId.value = info.plan_id;

          hasPlan.value = info.plan_id !== null && info.plan_id !== undefined;

          if (info.email) {
            userStats.userEmail = info.email;
          }
          if (info.balance !== undefined) {
            userBalance.value = info.balance;
            updateAccountBalanceDisplay();
          }
          if (info.expired_at) {
            userPlan.value.expireDate = formatDate(info.expired_at);
            userPlan.value.isExpireDatePermanent = false;

            const now = new Date();
            const expiredDate = new Date(info.expired_at * 1000);
            const diffTime = expiredDate - now;

            if (diffTime <= 0) {
              userStats.remainingDays = '0';
              userStats.isRemainingDaysPermanent = false;
            } else {
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              userStats.remainingDays = `${diffDays}`;
              userStats.isRemainingDaysPermanent = false;
            }
          } else {
            userPlan.value.expireDate = null;
            userPlan.value.isExpireDatePermanent = true;
            userStats.remainingDays = null;
            userStats.isRemainingDaysPermanent = true;
          }
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        loading.userInfo = false;
      }
    };

    const isExpiringSoon = computed(() => {
      if (userStats.isRemainingDaysPermanent) return false;

      const days = parseInt(userStats.remainingDays, 10);
      return !isNaN(days) && days > 0 && days <= DASHBOARD_CONFIG.expiringThreshold;
    });

    const hasIOSClients = computed(() => {
      return clientConfig.showShadowrocket ||
          clientConfig.showSurge ||
          clientConfig.showStash ||
          clientConfig.showQuantumultX ||
          clientConfig.showHiddifyIOS ||
          clientConfig.showSingboxIOS ||
          clientConfig.showLoon;
    });

    const hasAndroidClients = computed(() => {
      return clientConfig.showV2rayNG ||
          clientConfig.showClashAndroid ||
          clientConfig.showSurfboard ||
          clientConfig.showClashMetaAndroid ||
          clientConfig.showNekobox ||
          clientConfig.showSingboxAndroid ||
          clientConfig.showHiddifyAndroid;
    });

    const hasWindowsClients = computed(() => {
      return clientConfig.showClashWindows ||
          clientConfig.showFlClashWindows ||
          clientConfig.showClashVergeWindows ||
          clientConfig.showNekoray ||
          clientConfig.showSingboxWindows ||
          clientConfig.showHiddifyWindows;
    });

    const hasMacOSClients = computed(() => {
      return clientConfig.showClashX ||
          clientConfig.showFlClashMac ||
          clientConfig.showClashVergeMac ||
          clientConfig.showClashMetaX ||
          clientConfig.showSurgeMac ||
          clientConfig.showStashMac ||
          clientConfig.showQuantumultXMac ||
          clientConfig.showSingboxMac ||
          clientConfig.showHiddifyMac;
    });

    const isExpired = computed(() => {
      if (userStats.isRemainingDaysPermanent) return false;

      const days = parseInt(userStats.remainingDays, 10);
      return !isNaN(days) && days <= 0;
    });

    const isLowTraffic = computed(() => {
      return isTrafficBelowThreshold(
          userStats.remainingTraffic,
          userPlan.value?.totalTraffic,
          DASHBOARD_CONFIG.lowTrafficThreshold
      ) && !isTrafficDepleted.value;
    });

    const isTrafficDepleted = computed(() => isTrafficEmpty(userStats.remainingTraffic));

    const showResetTrafficButton = computed(() => {
      if (!DASHBOARD_CONFIG.enableResetTraffic) return false;

      switch (DASHBOARD_CONFIG.resetTrafficDisplayMode) {
        case 'always':
          return true;
        case 'low':
          return isLowTraffic.value || isTrafficDepleted.value;
        case 'depleted':
          return isTrafficDepleted.value;
        default:
          return false;
      }
    });

    const showRenewPlanButton = computed(() => {
      if (!DASHBOARD_CONFIG.enableRenewPlan) return false;


      switch (DASHBOARD_CONFIG.renewPlanDisplayMode) {
        case 'always':
          return true;
        case 'expiring':
          return isExpiringSoon.value;
        case 'expired':
          return isExpired.value;
        default:
          return false;
      }
    });


    const fetchSubscribe = async () => {
      // 如果showResetTrafficButton为true，强制执行（跳过缓存逻辑）
      // if (showResetTrafficButton.value) {
      //   // 强制执行，但仍要防止并发
      //   if (loading.subscribe === true) return;
      // } else {
      // 正常的缓存逻辑
      if (loading.subscribe === false && userPlan.value.subscribeUrl) return;
      // }

      loading.subscribe = true;
      try {
        const response = await getSubscribe();
        allowNewPeriod.value = response.data.allow_new_period;
        if (response.data) {
          const subscribe = response.data;
          if (subscribe.plan && subscribe.plan.name) {
            userPlan.value.name = subscribe.plan.name;
          }
          if (subscribe.plan && subscribe.plan.id) {
            userPlanId.value = subscribe.plan.id;
          }
          if (subscribe.expired_at) {
            userPlan.value.expireDate = formatDate(subscribe.expired_at);
            userPlan.value.isExpireDatePermanent = false;

            const now = new Date();
            const expiredDate = new Date(subscribe.expired_at * 1000);
            const diffTime = expiredDate - now;

            if (diffTime <= 0) {
              userStats.remainingDays = '0';
              userStats.isRemainingDaysPermanent = false;
            } else {
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              userStats.remainingDays = `${diffDays}`;
              userStats.isRemainingDaysPermanent = false;
            }
          } else {
            userPlan.value.expireDate = null;
            userPlan.value.isExpireDatePermanent = true;
            userStats.remainingDays = null;
            userStats.isRemainingDaysPermanent = true;
          }
          if (subscribe.transfer_enable) {
            userPlan.value.totalTraffic = formatTraffic(subscribe.transfer_enable);
          }
          if (subscribe.transfer_enable && subscribe.u !== undefined && subscribe.d !== undefined) {
            const usedTraffic = subscribe.u + subscribe.d;
            const remainingTraffic = Math.max(0, subscribe.transfer_enable - usedTraffic);
            userStats.remainingTraffic = formatTraffic(remainingTraffic);
          }
          if (subscribe.reset_day) {
            userPlan.value.resetDay = subscribe.reset_day;
          }
          if (subscribe.subscribe_url) {
            userPlan.value.subscribeUrl = subscribe.subscribe_url;
          }

          if (subscribe.device_limit !== undefined) {
            userPlan.value.deviceLimit = subscribe.device_limit;
          }
          if (subscribe.alive_ip !== undefined) {
            userPlan.value.aliveIp = subscribe.alive_ip;
          }

          if (subscribe.expired_at) {
            const now = new Date();
            const expiredDate = new Date(subscribe.expired_at * 1000);
            const diffTime = expiredDate - now;

            if (diffTime <= 0) {
              userStats.remainingDays = '0';
              userStats.isRemainingDaysPermanent = false;
            } else {
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              userStats.remainingDays = `${diffDays}`;
              userStats.isRemainingDaysPermanent = false;
            }
          } else {
            userStats.remainingDays = null;
            userStats.isRemainingDaysPermanent = true;
          }
        }
      } catch (error) {
        console.error('获取订阅信息失败:', error);
      } finally {
        loading.subscribe = false;
      }
    };

    const fetchNotices = async () => {
      if (loading.notices === false && notices.value.data && notices.value.data.length > 0) return;

      loading.notices = true;
      try {
        const response = await getNotices();
        if (response && response.data) {
          notices.value = response;

          checkForPopupNotices();
        }
      } catch (error) {
      } finally {
        loading.notices = false;
      }
    };

    const checkForPopupNotices = () => {
      if (!notices.value || !notices.value.data || notices.value.data.length === 0) return;

      const popupNoticeIndex = notices.value.data.findIndex(notice =>
          notice.tags && Array.isArray(notice.tags) && notice.tags.includes('\u5f39\u7a97')
      );

      if (popupNoticeIndex !== -1) {
        const noticeId = notices.value.data[popupNoticeIndex].id;
        const popupShownKey = `popup_notice_shown_${noticeId}`;

        if (!sessionStorage.getItem(popupShownKey)) {
          currentNoticeIndex.value = popupNoticeIndex;
          showNoticeDetails.value = true;
          sessionStorage.setItem(popupShownKey, 'true');
          nextTick(() => {
            updateModalHeight();
          });
        }
      }
    };

    const fetchUserStats = async () => {
      if (loading.userStats === false && userStats.remainingTraffic !== '0 GB') return;

      loading.userStats = true;
      try {
        const response = await getUserStats();
        if (response.data && Array.isArray(response.data) && response.data.length >= 2) {
          const stats = response.data;
          userStats.pendingOrders = stats[0];
          userStats.pendingTickets = stats[1];
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        loading.userStats = false;
      }
    };

    const formatTraffic = formatTrafficSize;

    const hasPendingItems = computed(() => {
      return userStats.pendingOrders > 0 || userStats.pendingTickets > 0;
    });

    const prevNotice = () => {
      if (currentNoticeIndex.value > 0) {
        currentNoticeIndex.value--;
      }
    };

    const nextNotice = () => {
      if (currentNoticeIndex.value < notices.value.data.length - 1) {
        currentNoticeIndex.value++;
      }
    };

    const showNoticeModal = () => {
      showNoticeDetails.value = true;
      nextTick(() => {
        updateModalHeight();
      });
    };

    const closeNoticeModal = () => {
      showNoticeDetails.value = false;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString * 1000);
      return date.toLocaleDateString();
    };

    const updateQRCodeUrl = async () => {
      if (userPlan.value.subscribeUrl) {
        qrCodeLoading.value = true;
        try {
          (await import('qrcode')).default.toDataURL(userPlan.value.subscribeUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
              .then(url => {
                qrCodeUrl.value = url;
                qrCodeLoading.value = false;
              })
              .catch(err => {
                console.error('二维码生成失败:', err);
                qrCodeLoading.value = false;
                showToast(t('dashboard.qrCodeGenerationFailed'), 'error', 3000);
              });
        } catch (error) {
          console.error('生成二维码失败:', error);
          qrCodeLoading.value = false;
          showToast(t('dashboard.qrCodeGenerationFailed'), 'error', 3000);
        }
      }
    };

    const qrCodeLoaded = () => {
      qrCodeLoading.value = false;
    };

    const copySubscription = () => {
      if (userPlan.value.subscribeUrl) {
        const copyWithAPI = () => {
          navigator.clipboard.writeText(userPlan.value.subscribeUrl)
              .then(() => {
                showToast(t('dashboard.subscriptionCopied'), 'success', 3000);
              })
              .catch(() => {
                showToast(t('dashboard.copyFailed'), 'error', 3000);
              });
        };

        const copyWithFallback = () => {
          try {
            const textarea = document.createElement('textarea');
            textarea.value = userPlan.value.subscribeUrl;
            textarea.style.position = 'fixed';
            textarea.style.left = '0';
            textarea.style.top = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);

            if (successful) {
              showToast(t('dashboard.subscriptionCopied'), 'success', 3000);
            } else {
              showToast(t('dashboard.copyFailed'), 'error', 3000);
            }
          } catch (err) {
            console.error('使用后备方法复制失败:', err);
            showToast(t('dashboard.copyFailed'), 'error', 3000);
          }
        };

        if (navigator.clipboard) {
          copyWithAPI();
        } else {
          copyWithFallback();
        }
      }
    };

    const importToClient = (clientType) => {
      if (!userPlan.value.subscribeUrl) {
        showToast(t('dashboard.noSubscription'), 'error', 3000);
        return;
      }

      const subscribeUrl = userPlan.value.subscribeUrl;
      const siteName = SITE_CONFIG.siteName || '订阅';

      let url = '';
      let shouldUseCurrentWindow = true;

      try {
        switch (clientType) {
          case 'shadowrocket':
            url = `shadowrocket://add/sub://${window.btoa(subscribeUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}?remark=${encodeURIComponent(siteName)}`;
            break;
          case 'surge':
          case 'surge-mac':
            url = `surge:///install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'stash':
          case 'stash-mac':
            url = `stash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'quantumultx':
          case 'quantumultx-mac':
            url = `quantumult-x:///update-configuration?remote-resource=${encodeURI(JSON.stringify({server_remote: [`${subscribeUrl}, tag=${encodeURIComponent(siteName)}`,],}))}`;
            break;
          case 'loon':
            url = `loon://import?nodelist=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'v2rayng':
            url = `v2rayng://install-sub?url=${encodeURIComponent(subscribeUrl)}#${encodeURIComponent(siteName)}`;
            break;
          case 'clash':
          case 'clash-android':
          case 'clash-meta-android':
          case 'flclash':
          case 'clashverge':
          case 'nekobox':
          case 'nekoray':
          case 'clashx':
          case 'clashx-meta':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'surfboard':
            url = `surfboard:///install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'singbox-ios':
          case 'singbox-android':
          case 'singbox-windows':
          case 'singbox-macos':
            url = `sing-box://import-remote-profile?url=${encodeURIComponent(subscribeUrl)}#${encodeURIComponent(siteName)}`;
            break;
          case 'hiddify-android':
          case 'hiddify-windows':
          case 'hiddify-macos':
          case 'hiddify-ios':
            url = `hiddify://import/${subscribeUrl}#${encodeURIComponent(siteName)}`;
            break;
          default:
            navigator.clipboard.writeText(subscribeUrl)
              .then(() => {
                showToast(t('dashboard.subscriptionCopied'), 'success', 3000);
              })
              .catch(() => {
                showToast(t('dashboard.copyFailed'), 'error', 3000);
              });
            return;
        }

        if (url) {
          if (shouldUseCurrentWindow) {
            window.location.href = url;
          } else {
            window.open(url, '_blank');
          }
        }
      } catch (error) {
        console.error('导入客户端失败:', error);
      }
    };

    const goToSupport = () => {
      if (window.innerWidth < 905) {
        router.push('/mobile/tickets');
      } else {
        router.push('/tickets');
      }
    };

    const toggleImportCard = () => {
      showImportCard.value = !showImportCard.value;
      if (showImportCard.value) {
        nextTick(() => {
          setTimeout(() => {
            const importCard = document.querySelector('.import-card');
            if (importCard) {
              importCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }
          }, 100);
        });
      }
    };

    const fetchUserConfig = async () => {
      try {
        const response = await getUserConfig();
        if (response.data) {
          if (response.data.currency_symbol) {
            currencySymbol.value = response.data.currency_symbol;
            if (userStats.accountBalance) {
              updateAccountBalanceDisplay();
            }
          }
        }
      } catch (error) {
        console.error('获取用户配置失败:', error);
      }
    };

    const updateAccountBalanceDisplay = () => {
      if (userBalance.value) {
        userStats.accountBalance = `${currencySymbol.value}${(parseFloat(userBalance.value) / 100).toFixed(2)}`;
      }
    };

    onMounted(async () => {
      await fetchUserConfig();

      fetchUserInfo();

      fetchSubscribe();

      fetchNotices();

      fetchUserStats();

      updateQRCodeUrl();
    });

    watch(() => userPlan.value.subscribeUrl, () => {
      updateQRCodeUrl();
    });

    const processedNoticeContent = computed(() => {
      if (!notices.value?.data?.[currentNoticeIndex.value]?.content) {
        return '';
      }

      const content = notices.value.data[currentNoticeIndex.value].content;

      const hasHtml = /<[a-z][\s\S]*>/i.test(content);

      if (hasHtml) {
        let processedContent = content.replace(/\n/g, '<br>');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedContent;

        const buttons = tempDiv.querySelectorAll('button, a');
        buttons.forEach(button => {
          if (button.className && button.className.includes('eztheme-btn')) {
            button.classList.remove('markdown-link');
            button.style.textDecoration = 'none';
            button.style.borderBottom = 'none';
            button.setAttribute('data-no-markdown-style', 'true');
          }

          if (button.tagName.toLowerCase() === 'a') {
            const href = button.getAttribute('href');
            if (href && (href.includes('#eztheme-btn') || href.includes('?eztheme-btn') || href.includes('class=eztheme-btn'))) {
              button.href = href
                  .replace('#eztheme-btn', '')
                  .replace('?eztheme-btn', '')
                  .replace('class=eztheme-btn', '');
              button.classList.add('eztheme-btn');
              button.style.textDecoration = 'none';
              button.style.borderBottom = 'none';
              button.setAttribute('data-no-markdown-style', 'true');
            }
          }
        });

        return tempDiv.innerHTML;
      } else {
        return md.render(content);
      }
    });

    const windowWidth = ref(window.innerWidth);
    const windowHeight = ref(window.innerHeight);
    const noticeModalStyle = ref({});

    const updateModalHeight = () => {
      const isMobile = windowWidth.value <= 768;
      const availableHeight = windowHeight.value * (isMobile ? 0.75 : 0.8);

      noticeModalStyle.value = {
        maxHeight: `${availableHeight}px`
      };
    };

    const handleResize = () => {
      windowWidth.value = window.innerWidth;
      windowHeight.value = window.innerHeight;
      if (showNoticeDetails.value) {
        updateModalHeight();
      }
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
    });

    const renewPlan = () => {
      if (!userPlanId.value) {
        showToast(t('dashboard.noPlanToRenew'), 'error', 3000);
        return;
      }

      router.push(`/order-confirm?id=${userPlanId.value}`);
    };

    const isXiaoPanel = isXiaoV2board();

    const navigateToDeposit = () => {
      router.push('/wallet/deposit');
    };

    const showDeviceLimit = computed(() => {
      return isXiaoV2board() && DASHBOARD_CONFIG.showOnlineDevicesLimit;
    });

    const timers = {};
    const listeners = {};

    const startAutoRotateNotices = () => {
      if (!autoRotateNotices.value) return;

      createTimer(timers, 'noticeRotation', () => {
        if (notices.value && notices.value.data && notices.value.data.length > 1) {
          nextNotice();
        }
      }, 8000, true);
    };

    onActivated(() => {
      if (needRefreshData.value) {
        fetchUserInfo();
        fetchUserStats();
        fetchNotices();
        needRefreshData.value = false;
      }

      startAutoRotateNotices();
    });

    onDeactivated(() => {
      needRefreshData.value = true;

      cleanupResources(timers, listeners);
    });

    onUnmounted(() => {
      cleanupResources(timers, listeners);
    });

    const needRefreshData = ref(false);

    const trafficPercentage = computed(() => Math.round(calculateTrafficPercentage(
      userStats.remainingTraffic,
      userPlan.value?.totalTraffic
    )));

    return {
      userStats,
      userBalance,
      currencySymbol,
      userPlan,
      clientConfig,
      notices,
      loading,
      languageChangedSignal,
      goToShop,
      openDocumentation,
      downloadClient,
      hasPendingItems,
      router,
      currentNoticeIndex,
      prevNotice,
      nextNotice,
      showImportCard,
      showQrCode,
      importToClient,
      goToSupport,
      formatDate,
      formatTraffic,
      toggleImportCard,
      copySubscription,
      platforms,
      activePlatform,
      qrCodeUrl,
      qrCodeLoading,
      qrCodeLoaded,
      showNoticeModal,
      closeNoticeModal,
      showNoticeDetails,
      checkForPopupNotices,
      noticeModalStyle,
      openResetTrafficModal,
      popupConfig,
      handlePopupClose,
      handlePopupConfirm,
      showPopup,
      closeResetTrafficModal,
      createResetTrafficOrder,
      showResetTrafficModal,
      resetConfirmCooldown,
      showResetTrafficButton,
      isCreatingResetOrder,
      hasIOSClients,
      hasAndroidClients,
      hasWindowsClients,
      hasMacOSClients,
      shadowrocketIcon,
      surgeIcon,
      stashIcon,
      quantumultIcon,
      singboxIcon,
      loonIcon,
      v2rayNGIcon,
      clashAndroidIcon,
      surfboardIcon,
      clashMetaAndroidIcon,
      nekoboxIcon,
      singboxAndroidIcon,
      hiddifyAndroidIcon,
      flclashIcon,
      clashvergeIcon,
      clashWindowsIcon,
      nekorayIcon,
      singboxWindowsIcon,
      hiddifyWindowsIcon,
      clashXIcon,
      clashMetaXIcon,
      surgeMacIcon,
      stashMacIcon,
      quantumultXMacIcon,
      singboxMacIcon,
      hiddifyMacIcon,
      isExpiringSoon,
      isExpired,
      isLowTraffic,
      isTrafficDepleted,
      hasPlan,
      processedNoticeContent,
      showRenewPlanButton,
      renewPlan,
      isXiaoPanel,
      navigateToDeposit,
      showDeviceLimit,
      needRefreshData,
      trafficPercentage,
      waterAnimationState,
      DASHBOARD_CONFIG,
      allowNewPeriod,
      showImportSubscription,
    };
  }
};
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;
  display: flex;
  justify-content: center;

  .dashboard-inner {
    width: 100%;
    max-width: 1200px;
  }

  .dashboard-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.75fr) minmax(280px, 0.85fr);
    gap: 20px;
    margin-bottom: 24px;
    animation: dashboard-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    transform-origin: center top;
  }

  .hero-main-panel,
  .hero-side-panel {
    border: 1px solid var(--card-border-color);
    border-radius: 18px;
    background: var(--card-background);
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
  }

  .hero-main-panel {
    position: relative;
    overflow: hidden;
    padding: 24px;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top left, rgba(var(--theme-color-rgb), 0.14), transparent 36%),
      linear-gradient(135deg, rgba(var(--theme-color-rgb), 0.08), transparent 52%);
      pointer-events: none;
    }

    > * {
      position: relative;
      z-index: 1;
    }
  }

  .hero-kicker,
  .hero-user,
  .hero-progress-head,
  .hero-actions,
  .hero-alert-row,
  .hero-notice-head,
  .hero-notice-nav,
  .hero-quick-link {
    display: flex;
    align-items: center;
  }

  .hero-kicker {
    gap: 8px;
    margin-bottom: 14px;
    color: var(--secondary-text-color);
    font-size: 13px;
    font-weight: 600;
  }

  .hero-status-dot {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    color: #22c55e;
    box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.12);

    &::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: inherit;
      background: currentColor;
      opacity: 0.14;
      animation: hero-status-pulse 2.4s ease-out infinite;
    }

    &.inactive {
      background: #94a3b8;
      color: #94a3b8;
      box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.13);
    }

    &.warning {
      background: #f59e0b;
      color: #f59e0b;
      box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.14);
    }

    &.danger {
      background: #ef4444;
      color: #ef4444;
      box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.14);
    }
  }

  .hero-title-row {
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .hero-title {
    margin: 0;
    color: var(--text-color);
    font-size: clamp(26px, 3vw, 36px);
    font-weight: 760;
    letter-spacing: 0;
    line-height: 1.15;
  }

  .hero-subtitle {
    max-width: 620px;
    margin: 10px 0 0;
    color: var(--secondary-text-color);
    font-size: 14px;
    line-height: 1.7;
  }

  .hero-user {
    align-self: flex-start;
    max-width: 280px;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid rgba(var(--theme-color-rgb), 0.12);
    border-radius: 999px;
    color: var(--secondary-text-color);
    background: rgba(var(--theme-color-rgb), 0.06);
    font-size: 13px;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .hero-progress {
    margin-top: 24px;
  }

  .hero-progress-head {
    justify-content: space-between;
    margin-bottom: 10px;
    color: var(--secondary-text-color);
    font-size: 13px;

    strong {
      color: var(--text-color);
      font-size: 18px;
    }
  }

  .hero-progress-track {
    position: relative;
    overflow: hidden;
    height: 10px;
    border-radius: 999px;
    background: rgba(var(--theme-color-rgb), 0.1);
  }

  .hero-progress-bar {
    position: relative;
    overflow: hidden;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--theme-color), rgba(var(--theme-color-rgb), 0.62));
    transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent);
      transform: translateX(-100%);
      animation: hero-progress-sheen 1.35s 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    &.warning {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }

    &.danger {
      background: linear-gradient(90deg, #ef4444, #fb7185);
    }
  }

  .hero-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
    gap: 12px;
    margin-top: 22px;
  }

  .hero-metric {
    padding: 14px;
    border: 1px solid rgba(var(--theme-color-rgb), 0.1);
    border-radius: 14px;
    background: rgba(var(--theme-color-rgb), 0.045);
    animation: dashboard-item-rise 0.44s cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.24s ease, background-color 0.24s ease;

    &:hover {
      transform: translateY(-2px);
      border-color: rgba(var(--theme-color-rgb), 0.22);
      background: rgba(var(--theme-color-rgb), 0.07);
    }

    &:nth-child(1) {
      animation-delay: 0.06s;
    }

    &:nth-child(2) {
      animation-delay: 0.1s;
    }

    &:nth-child(3) {
      animation-delay: 0.14s;
    }

    &:nth-child(4) {
      animation-delay: 0.18s;
    }

    span,
    strong {
      display: block;
    }

    span {
      color: var(--secondary-text-color);
      font-size: 12px;
    }

    strong {
      margin-top: 6px;
      color: var(--text-color);
      font-size: 18px;
      font-weight: 720;
      word-break: break-word;
    }
  }

  .hero-actions {
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 22px;
  }

  .hero-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 11px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 0 0 rgba(var(--theme-color-rgb), 0);
    animation: dashboard-item-rise 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.22s ease, background-color 0.22s ease, color 0.22s ease, box-shadow 0.22s ease;

    &:hover {
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0) scale(0.98);
    }

    &:nth-child(1) {
      animation-delay: 0.16s;
    }

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.24s;
    }

    &:nth-child(4) {
      animation-delay: 0.28s;
    }

    &:nth-child(5) {
      animation-delay: 0.32s;
    }

    &:nth-child(6) {
      animation-delay: 0.36s;
    }

    &.primary {
      color: #fff;
      background: var(--theme-color);

      &:hover {
        box-shadow: 0 10px 22px rgba(var(--theme-color-rgb), 0.2);
      }
    }

    &.secondary {
      color: var(--theme-color);
      border-color: rgba(var(--theme-color-rgb), 0.24);
      background: rgba(var(--theme-color-rgb), 0.08);
    }

    &.ghost {
      color: var(--secondary-text-color);
      border-color: var(--card-border-color);
      background: var(--card-background);
    }
  }

  .hero-side-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
  }

  .hero-alert-row,
  .hero-quick-link,
  .hero-notice-card {
    width: 100%;
    border: 1px solid var(--card-border-color);
    border-radius: 14px;
    background: rgba(var(--theme-color-rgb), 0.045);
    color: var(--text-color);
    cursor: pointer;
    animation: dashboard-item-rise 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: transform 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;

    &:hover {
      transform: translateY(-2px);
      border-color: rgba(var(--theme-color-rgb), 0.28);
      background: rgba(var(--theme-color-rgb), 0.08);
    }
  }

  .hero-alert-row,
  .hero-quick-link {
    justify-content: space-between;
    gap: 12px;
    padding: 13px 14px;
    font-weight: 600;
  }

  .hero-alert-row {
    animation-delay: 0.12s;
  }

  .hero-notice {
    animation: dashboard-item-rise 0.42s 0.16s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .hero-quick-link {
    animation-delay: 0.2s;
  }

  .hero-alert-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    color: var(--theme-color);
    background: rgba(var(--theme-color-rgb), 0.12);
  }

  .hero-notice {
    padding: 2px 0 0;
    border-top: 1px solid rgba(var(--theme-color-rgb), 0.1);
  }

  .hero-notice-head {
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 700;

    small {
      color: var(--secondary-text-color);
      font-weight: 600;
    }
  }

  .hero-notice-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 12px;
    min-height: 48px;
    padding: 10px 2px;
    border: 0;
    border-radius: 0;
    background: transparent;
    text-align: left;
    transition: color 0.2s ease;

    span,
    small {
      display: block;
    }

    span {
      overflow: hidden;
      color: var(--text-color);
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      color: var(--secondary-text-color);
      white-space: nowrap;
    }

    &:hover {
      transform: none;
      border-color: transparent;
      background: transparent;

      span {
        color: var(--theme-color);
      }
    }
  }

  .hero-notice-nav {
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--card-border-color);
      border-radius: 10px;
      color: var(--secondary-text-color);
      background: transparent;
      cursor: pointer;
      transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;

      &:hover:not(:disabled) {
        color: var(--theme-color);
        border-color: rgba(var(--theme-color-rgb), 0.24);
        background: rgba(var(--theme-color-rgb), 0.06);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }
  }

  .hero-quick-link span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .dashboard-card {
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: none;
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid var(--card-border-color);
    transition: border-color 0.3s ease, background-color 0.3s ease, transform 0.3s ease;

    &:hover {
      box-shadow: none;
      border-color: var(--card-hover-border-color);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      .card-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }

      .card-actions {
        display: flex;
        gap: 10px;
      }
    }
  }

  .download-card {
    .download-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 20px;

      @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
      }

      @media (min-width: 992px) {
        grid-template-columns: repeat(6, 1fr);
      }

      .download-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        padding: 15px;
        border-radius: 10px;
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);

        &:hover {
          background-color: rgba(var(--theme-color-rgb), 0.05);
          transform: translateY(-2px);
        }

        .option-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin-bottom: 12px;

          &.ios {
            background-color: rgba(0, 122, 255, 0.1);
            color: #007aff;
          }

          &.android {
            background-color: rgba(61, 178, 74, 0.1);
            color: #3db24a;
          }

          &.macos {
            background-color: rgba(90, 90, 90, 0.1);
            color: #5a5a5a;
          }

          &.windows {
            background-color: rgba(0, 120, 215, 0.1);
            color: #0078d7;
          }

          &.linux {
            background-color: rgba(243, 123, 29, 0.1);
            color: #f37b1d;
          }

          &.openwrt {
            background-color: rgba(0, 136, 204, 0.1);
            color: #0088cc;
          }
        }

        .option-name {
          font-size: 14px;
          font-weight: 500;
        }
      }
    }
  }

}


.skeleton-loading {
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.2) 20%,
            rgba(255, 255, 255, 0.5) 60%,
            rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 2s infinite;
    z-index: 1;
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}


.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@keyframes dashboard-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dashboard-item-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes hero-progress-sheen {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(120%);
  }
}

@keyframes hero-status-pulse {
  from {
    opacity: 0.18;
    transform: scale(0.7);
  }
  to {
    opacity: 0;
    transform: scale(1.7);
  }
}

@media (max-width: 900px) {
  .dashboard-container .dashboard-hero {
    grid-template-columns: 1fr;
  }

  .dashboard-container .hero-title-row {
    flex-direction: column;
  }

  .dashboard-container .hero-user {
    max-width: 100%;
  }
}

@media (max-width: 560px) {
  .dashboard-container .hero-main-panel,
  .dashboard-container .hero-side-panel {
    border-radius: 16px;
  }

  .dashboard-container .hero-main-panel {
    padding: 18px;
  }

  .dashboard-container .hero-metrics {
    grid-template-columns: 1fr;
  }

  .dashboard-container .hero-btn {
    width: 100%;
  }

  .dashboard-container .hero-notice-card {
    grid-template-columns: 1fr;

    small {
      margin-top: 4px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-container .dashboard-hero,
  .dashboard-container .hero-progress-bar,
  .dashboard-container .hero-progress-bar::after,
  .dashboard-container .hero-status-dot::after,
  .dashboard-container .hero-metric,
  .dashboard-container .hero-btn,
  .dashboard-container .hero-alert-row,
  .dashboard-container .hero-notice,
  .dashboard-container .hero-quick-link,
  .dashboard-container .hero-notice-card {
    animation: none;
    transition: none;
  }
}


@media (max-width: 768px) {
  .dashboard-container {
    padding: 15px;
    padding-bottom: 80px;
  }

  .platform-selector {
    flex-wrap: wrap;
  }
}


.btn-active {
  background-color: rgba(var(--theme-color-rgb), 0.1);
  color: var(--theme-color);
  border-color: var(--theme-color);
}


.import-card {
  margin-bottom: 24px;
  overflow: hidden;
  will-change: transform, opacity;
  transform-origin: top center;
  contain: content;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  will-change: opacity, transform;
  backface-visibility: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: transparent;
  border: none;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    transform: rotate(90deg);

    .close-icon::before,
    .close-icon::after {
      background-color: var(--theme-color);
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
  }

  .close-icon {
    position: relative;
    width: 20px;
    height: 20px;

    &::before,
    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 2px;
      background-color: var(--secondary-text-color);
      border-radius: 2px;
      top: 50%;
      left: 0;
      transition: background-color 0.2s ease;
    }

    &::before {
      transform: translateY(-50%) rotate(45deg);
    }

    &::after {
      transform: translateY(-50%) rotate(-45deg);
    }
  }
}

.import-action {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 10px;
  cursor: pointer;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    transform: translateY(-2px);
  }

  .import-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    border-radius: 10px;
    margin-right: 16px;
    background-color: rgba(var(--theme-color-rgb), 0.1);
    color: var(--theme-color);
  }

  .import-content {
    flex: 1;

    .import-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .import-desc {
      font-size: 13px;
      color: var(--secondary-text-color);
    }
  }
}

.copy-action .import-icon {
  background-color: rgba(25, 113, 194, 0.1);
  color: #1971c2;
}

.qrcode-action .import-icon {
  background-color: rgba(64, 192, 87, 0.1);
  color: #40c057;
}

.platform-section {
  margin-bottom: 24px;

  .platform-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(var(--theme-color-rgb), 0.1);
  }

  .platform-options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;

    .platform-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      border-radius: 10px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.1);
        transform: translateY(-3px);
        border-color: var(--theme-color);
      }

      svg {
        margin-bottom: 8px;
        color: var(--theme-color);
      }

      span {
        font-size: 14px;
      }
    }
  }
}


.qrcode-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.qrcode-modal {
  background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--theme-color-rgb), 0.15);
  width: 90%;
  max-width: 360px;
  overflow: hidden;
  animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
  }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.qrcode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(var(--theme-color-rgb), 0.03);

  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-color);
    font-weight: 600;
  }
}

.qrcode-content {
  padding: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, rgba(var(--theme-color-rgb), 0.02), transparent);

  img {
    width: 220px;
    height: 220px;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    background-color: white;
    padding: 15px;
    object-fit: cover;
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }
  }

  .qrcode-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 25px;
    min-height: 220px;

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(var(--theme-color-rgb), 0.2);
      border-radius: 50%;
      border-top-color: var(--theme-color);
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 15px;
    }

    p {
      font-size: 15px;
      color: var(--secondary-text-color);
      font-weight: 500;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .platform-options {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .import-action {
    padding: 12px;

    .import-icon {
      width: 40px;
      height: 40px;
    }
  }
}


.platform-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;

  .platform-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-color);

    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      transform: translateY(-1px);
      border-color: rgba(var(--theme-color-rgb), 0.2);
    }

    &.active {
      background-color: rgba(var(--theme-color-rgb), 0.15);
      color: var(--theme-color);
      border-color: var(--theme-color);
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(var(--theme-color-rgb), 0.2);
    }

    svg {
      color: var(--theme-color);
      opacity: 0.8;
    }
  }
}


.client-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  margin-bottom: 8px;
  object-fit: cover;
}

.platform-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 10px;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  cursor: pointer;
  transition: all 0.3s ease;

  svg {
    margin-bottom: 8px;
    color: var(--theme-color);
  }

  span {
    font-size: 14px;
  }
}


.import-action .import-content .import-desc {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.no-clients-message {
  padding: 20px;
  text-align: center;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  border-radius: 12px;
  margin: 10px 0;
  border: 1px dashed rgba(var(--theme-color-rgb), 0.3);
}

.no-clients-message p {
  color: var(--text-color);
  font-size: 14px;
  margin: 0;
}


.platform-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;

  .platform-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-color);

    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      transform: translateY(-1px);
      border-color: rgba(var(--theme-color-rgb), 0.2);
    }

    &.active {
      background-color: rgba(var(--theme-color-rgb), 0.15);
      color: var(--theme-color);
      border-color: var(--theme-color);
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(var(--theme-color-rgb), 0.2);
    }

    svg {
      color: var(--theme-color);
      opacity: 0.8;
    }
  }
}


.notice-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  backdrop-filter: blur(4px);
}

.notice-modal {
  width: 100%;
  max-width: 500px;
  background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--theme-color-rgb), 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
  }
}

.notice-modal-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(var(--theme-color-rgb), 0.03);

  .popup-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color);
  }

  .popup-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--secondary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    margin: -8px;
    border-radius: 50%;
    transition: all 0.3s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--text-color);
      transform: rotate(90deg);
    }
  }
}

.notice-modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background: linear-gradient(to bottom, rgba(var(--theme-color-rgb), 0.02), transparent);

  .notice-content {
    font-size: 14px;
    line-height: 1.6;

    :deep(p) {
      margin: 12px 0;
      line-height: 1.6;
      color: var(--text-color);
    }

    :deep(strong) {
      color: var(--theme-color);
      font-weight: 600;
    }

    :deep(a) {
      color: var(--theme-color);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    :deep(img) {
      max-width: 100%;
      height: auto;
      margin: 10px 0;
      border-radius: 8px;
    }

    :deep(ul), :deep(ol) {
      padding-left: 20px;
      margin-bottom: 16px;

      li {
        margin-bottom: 8px;
        list-style-position: outside;
      }
    }

    :deep(ul) li {
      list-style-type: disc;
    }

    :deep(ol) li {
      list-style-type: decimal;
    }

    :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
    }

    :deep(blockquote) {
      padding: 10px 15px;
      margin: 16px 0;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      border-radius: 6px;

      p {
        margin: 8px 0;
      }
    }

    :deep(code) {
      font-family: monospace;
      background-color: rgba(var(--theme-color-rgb), 0.1);
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 0.9em;
    }

    :deep(pre) {
      background-color: rgba(var(--theme-color-rgb), 0.05);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 16px 0;

      code {
        background-color: transparent;
        padding: 0;
      }
    }

    :deep(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;

      th, td {
        border: 1px solid var(--border-color);
        padding: 8px 12px;
        text-align: left;
      }

      th {
        background-color: rgba(var(--theme-color-rgb), 0.05);
        font-weight: 600;
      }

      tr:nth-child(even) {
        background-color: rgba(var(--theme-color-rgb), 0.02);
      }
    }

    :deep(a.eztheme-btn) {
      display: inline-block;
      padding: 8px 16px;
      background-color: var(--theme-color);
      color: white;
      border-radius: 8px;
      margin: 10px 0;
      text-decoration: none;
      transition: all 0.3s ease;

      &:hover {
        background-color: var(--primary-color-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(var(--theme-color-rgb), 0.3);
      }
    }
  }
}

.notice-modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;

  .popup-action-btn {
    padding: 8px 20px;
    background-color: var(--theme-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 120px;

    &.adaptive-btn {
      min-width: auto;
      padding: 8px 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.3);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      background-color: var(--secondary-text-color);
    }
  }
}

.popup-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.popup-slide-leave-active {
  transition: all 0.2s ease-out;
}

.popup-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.popup-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}


@media (max-width: 768px) {
  .notice-modal-overlay {
    padding: 15px;

    .notice-modal {
      max-width: 100%;
      max-height: 85vh;

      .notice-modal-header {
        padding: 15px;

        .popup-title {
          font-size: 16px;
        }
      }

      .notice-modal-content {
        padding: 15px;
      }

      .notice-modal-footer {
        padding: 12px 15px;
      }
    }
  }
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-card {
  background-color: var(--card-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reset-traffic-modal {
  .modal-header {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color);
    }

    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--secondary-text-color);
      cursor: pointer;
      padding: 0;

      &:hover {
        color: var(--text-color);
      }
    }
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;

    .warning-icon {
      margin-bottom: 16px;
      color: #ff9800;
    }

    .warning-text {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 12px;
      text-align: center;
      color: var(--text-color);
    }

    .note-text {
      font-size: 14px;
      color: var(--secondary-text-color);
      text-align: center;
      margin-bottom: 0;
      padding: 8px 12px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      border-radius: 6px;
      width: 100%;
    }
  }

  .modal-footer {
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid var(--border-color);

    button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none !important;
      }
    }

    .cancel-btn {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);

      &:hover:not(:disabled) {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }

    .confirm-btn {
      background-color: #f44336;
      color: white;
      border: none;

      &:hover:not(:disabled) {
        background-color: #e53935;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
      }
    }
  }
}


.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}


.loader-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid #fff;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}


.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}


</style>

<!-- 全局样式，不受scoped限制 -->
<style lang="scss">
.eztheme-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  background-color: rgba(var(--theme-color-rgb), 0.1) !important;
  color: var(--theme-color) !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  font-weight: 500 !important;
  margin: 8px 0 !important;
  text-decoration: none !important;
  border-bottom: none !important;
  text-align: center !important;
  box-shadow: none !important;
  border-color: transparent !important;
  width: auto !important;

  &:hover, &:active, &:focus, &:visited {
    background-color: rgba(var(--theme-color-rgb), 0.2) !important;
    transform: translateY(-1px) !important;
    box-shadow: none !important;
    border-bottom: none !important;
    text-decoration: none !important;
    color: var(--theme-color) !important;
    border-color: transparent !important;
  }

  &:active {
    transform: translateY(0) !important;
    box-shadow: none !important;
  }

  &:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.3) !important;
  }
}


a.eztheme-btn {
  background-image: none !important;
  background-repeat: no-repeat !important;
  background-position: initial !important;
  background-size: initial !important;
  text-decoration: none !important;
  border-bottom: none !important;

  &::after, &::before {
    display: none !important;
    content: none !important;
  }
}


</style>
