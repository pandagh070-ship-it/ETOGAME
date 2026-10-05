using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace EtoDesktop
{
    internal sealed class DesktopLayer
    {
        private Window wallpaper;
        private Window taskbar;
        private DispatcherTimer clockTimer;
        private TextBlock clockText;
        private bool taskbarOn;
        private bool clockOn;
        private string mediaPath;
        private string mediaType;

        public void Apply(string path, string type, bool showTaskbar, bool showClock)
        {
            mediaPath = path;
            mediaType = type;
            SetWallpaper();
            SetTaskbar(showTaskbar);
            SetClock(showClock);
        }

        private void SetWallpaper()
        {
            if (wallpaper == null)
            {
                wallpaper = new Window
                {
                    WindowStyle = WindowStyle.None,
                    ResizeMode = ResizeMode.NoResize,
                    ShowInTaskbar = false,
                    Topmost = false,
                    Background = Brushes.Black,
                    AllowsTransparency = false
                };
                wallpaper.Loaded += (s, e) =>
                {
                    var helper = new WindowInteropHelper(wallpaper);
                    var worker = NativeMethods.GetWorkerW();
                    if (worker != IntPtr.Zero) NativeMethods.SetParent(helper.Handle, worker);
                };
            }

            wallpaper.Width = SystemParameters.PrimaryScreenWidth;
            wallpaper.Height = SystemParameters.PrimaryScreenHeight;
            wallpaper.Left = 0;
            wallpaper.Top = 0;

            var root = new Grid();
            if (!string.IsNullOrEmpty(mediaPath) && File.Exists(mediaPath))
            {
                if (mediaType == "video")
                {
                    var video = new MediaElement
                    {
                        Source = new Uri(mediaPath),
                        LoadedBehavior = MediaState.Manual,
                        UnloadedBehavior = MediaState.Stop,
                        Stretch = Stretch.UniformToFill,
                        Volume = 0,
                        IsMuted = true
                    };
                    video.Loaded += (s, e) => { video.Play(); };
                    root.Children.Add(video);
                }
                else if (mediaType == "gif")
                {
                    var image = new Image { Stretch = Stretch.UniformToFill };
                    var decoder = new GifBitmapDecoder(new Uri(mediaPath), BitmapCreateOptions.PreservePixelFormat, BitmapCacheOption.OnLoad);
                    image.Source = decoder.Frames[0];
                    root.Children.Add(image);
                    if (decoder.Frames.Count > 1)
                    {
                        var index = 0;
                        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(80) };
                        timer.Tick += (s, e) =>
                        {
                            index = (index + 1) % decoder.Frames.Count;
                            image.Source = decoder.Frames[index];
                        };
                        timer.Start();
                    }
                }
                else
                {
                    root.Children.Add(new Image
                    {
                        Source = new BitmapImage(new Uri(mediaPath)),
                        Stretch = Stretch.UniformToFill
                    });
                }
            }
            wallpaper.Content = root;
            if (!wallpaper.IsVisible) wallpaper.Show();
            wallpaper.Activate();
            wallpaper.Topmost = false;
        }

        public void SetTaskbar(bool enabled)
        {
            taskbarOn = enabled;
            var native = NativeMethods.FindWindow("Shell_TrayWnd", null);
            if (native != IntPtr.Zero) NativeMethods.ShowWindow(native, enabled ? NativeMethods.SW_HIDE : NativeMethods.SW_SHOW);

            if (!enabled)
            {
                taskbar?.Hide();
                return;
            }

            if (taskbar == null)
            {
                taskbar = new Window
                {
                    WindowStyle = WindowStyle.None,
                    ResizeMode = ResizeMode.NoResize,
                    ShowInTaskbar = false,
                    Topmost = true,
                    Background = new SolidColorBrush(Color.FromArgb(235, 20, 24, 32)),
                    Height = 46
                };
                var panel = new DockPanel { LastChildFill = true, Margin = new Thickness(10, 0, 10, 0) };
                var start = new Button { Content = "ETO", Width = 60, Margin = new Thickness(0, 7, 8, 7) };
                start.Click += (s, e) => Process.Start(new ProcessStartInfo("explorer.exe") { UseShellExecute = true });
                panel.Children.Add(start);
                clockText = new TextBlock { Foreground = Brushes.White, FontSize = 16, VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Right };
                DockPanel.SetDock(clockText, Dock.Right);
                panel.Children.Add(clockText);
                taskbar.Content = panel;
            }

            taskbar.Width = SystemParameters.PrimaryScreenWidth;
            taskbar.Left = 0;
            taskbar.Top = SystemParameters.PrimaryScreenHeight - taskbar.Height;
            taskbar.Show();
            UpdateClock();
        }

        public void SetClock(bool enabled)
        {
            clockOn = enabled;
            if (clockTimer == null)
            {
                clockTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
                clockTimer.Tick += (s, e) => UpdateClock();
            }
            if (enabled) { clockTimer.Start(); UpdateClock(); }
            else clockTimer.Stop();
        }

        private void UpdateClock()
        {
            if (!clockOn) return;
            if (clockText != null) clockText.Text = DateTime.Now.ToString("HH:mm:ss  |  dd/MM/yyyy");
        }

        public void Restore()
        {
            if (clockTimer != null) clockTimer.Stop();
            taskbar?.Hide();
            wallpaper?.Close();
            var native = NativeMethods.FindWindow("Shell_TrayWnd", null);
            if (native != IntPtr.Zero) NativeMethods.ShowWindow(native, NativeMethods.SW_SHOW);
        }
    }
}