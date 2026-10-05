using Microsoft.Win32;
using System;
using System.IO;
using System.Windows;
using System.Windows.Media.Imaging;

namespace EtoDesktop
{
    public partial class MainWindow : Window
    {
        private string selectedBackground;
        private string selectedType = "image";
        private DesktopLayer layer;

        public MainWindow()
        {
            InitializeComponent();
            layer = new DesktopLayer();
        }

        private void Image_Click(object sender, RoutedEventArgs e)
        {
            ChooseFile("صور|*.png;*.jpg;*.jpeg;*.bmp");
        }

        private void Gif_Click(object sender, RoutedEventArgs e)
        {
            ChooseFile("GIF|*.gif");
        }

        private void Video_Click(object sender, RoutedEventArgs e)
        {
            ChooseFile("فيديو|*.mp4;*.wmv;*.avi;*.mpg;*.mpeg");
        }

        private void ChooseFile(string filter)
        {
            var dialog = new OpenFileDialog { Filter = filter, Multiselect = false };
            if (dialog.ShowDialog() == true)
            {
                selectedBackground = dialog.FileName;
                selectedType = Path.GetExtension(dialog.FileName).ToLowerInvariant() == ".gif"
                    ? "gif"
                    : (new[] { ".mp4", ".wmv", ".avi", ".mpg", ".mpeg" }.Contains(Path.GetExtension(dialog.FileName).ToLowerInvariant()) ? "video" : "image");
                BackgroundLabel.Text = Path.GetFileName(dialog.FileName);
                StatusText.Text = "تم اختيار الخلفية.";
            }
        }

        private void Apply_Click(object sender, RoutedEventArgs e)
        {
            layer.Apply(selectedBackground, selectedType, TaskbarEnabled.IsChecked == true, ClockEnabled.IsChecked == true);
            StatusText.Text = "تم تطبيق إعدادات سطح المكتب.";
        }

        private void TaskbarEnabled_Click(object sender, RoutedEventArgs e)
        {
            if (layer != null) layer.SetTaskbar(TaskbarEnabled.IsChecked == true);
        }

        private void ClockEnabled_Click(object sender, RoutedEventArgs e)
        {
            if (layer != null) layer.SetClock(ClockEnabled.IsChecked == true);
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            layer.Restore();
            Close();
        }
    }
}